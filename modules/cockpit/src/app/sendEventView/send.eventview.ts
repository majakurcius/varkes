import { Component, Input, OnInit } from '@angular/core';
import { Http, Headers, RequestOptions } from '@angular/http';
import { ServiceInstancesService } from '../service-instances/service-instances.service';
import * as ace from 'ace-builds/src-min-noconflict/ace.js';
import "ace-builds/webpack-resolver";

const ASYNC_API_2 = "2.0.0"

@Component({
    selector: 'send-event-view',
    templateUrl: './app.send.eventview.html'
})
export class SendEventViewComponent implements OnInit {

    @Input() event;
    @Input() remote;
    public topics;
    public topic;
    public showTopics;
    public loading: boolean;
    public baseUrl;
    public info;
    public alert;
    public alertMessage;
    public ariaExpanded = false;
    public ariaHidden = true;
    public tracing = true;
    public success;
    public topicName;
    public successMessage;
    public filteredTopicsNames = [];
    options: any = { maxLines: 1000, printMargin: false };

    constructor(private http: Http, private serviceInstance: ServiceInstancesService) {
    }

    public async ngOnInit() {
        this.event = JSON.parse(this.event);
        this.topics = Object.keys(this.event.events.spec.asyncapi == ASYNC_API_2 ? this.event.events.spec.channels : this.event.events.spec.topics).map((key: string) => {
            return key.split("/").join(".");
        });
        this.filteredTopicsNames = this.topics;
        this.filteredTopicsNames.sort();
        this.info = await this.serviceInstance.getInfo();
        this.baseUrl = this.serviceInstance.getBaseUrl();
        this.options['basePath'] = this.baseUrl;
    }
    public onOpenDropDown() {
        this.showTopics = true;
    }
    public onCloseDropDown() {
        this.showTopics = false;
    }

    public sendEvent() {
        if(!this.topicName){
            return
        }
        this.loading = true;
        let headers = new Headers({ 'Content-Type': 'application/json' });
        let httpOptions = new RequestOptions({ headers: headers });
        var editor = ace.edit("eventTopicEditor");
        let eventTime = new Date().toISOString();
        let eventType = this.topicName;
        var version;
        var regex = /^(.*)\.([v|V][0-9]+$)/;
        if (eventType.match(regex)) {
            var matchedGroups = regex.exec(eventType);
            version = matchedGroups[2];
            eventType = matchedGroups[1];
        }
        else {
            version = this.event.events.spec.info.version;
        }
        try {
            let eventData = {
                "event-type": eventType,
                "event-type-version": version, //event types normally end with .v1
                "event-time": eventTime,
                "data": JSON.parse(editor.getValue()),
                "event-tracing": this.tracing
            }
            this.http.post(this.baseUrl + this.info.links.events, eventData, httpOptions)
                .subscribe(
                    success => {
                        this.loading = false;
                        this.successMessage = "Event has been sent Successfully";
                        this.success = true;
                    },
                    error => {
                        this.alertMessage = JSON.parse(error._body).error
                        this.alert = true;
                        this.loading = false;
                    });
        }
        catch (err) {
            this.alertMessage = "Please make sure that the Event Data follows JSON format";
            this.alert = true;
            this.loading = false;
        }
    }

    public closeAlert() {
        this.alert = false;
    }
    public closeSuccessMessage() {
        this.success = false;
    }
    public toggleDropDown() {
        this.ariaExpanded = !this.ariaExpanded;
        this.ariaHidden = !this.ariaHidden;
    }

    public openDropDown(event: Event) {
        event.stopPropagation();
        this.ariaExpanded = true;
        this.ariaHidden = false;
    }

    public closeDropDown() {
        this.ariaExpanded = false;
        this.ariaHidden = true;
    }

    public selectedTopic(topic) {
        this.topicName = topic;
        this.topic = JSON.stringify(this.event.events.spec.asyncapi == ASYNC_API_2 ? this.event.events.spec.channels[topic.split(".").join("/")].example : this.event.events.spec.topics[topic].example, null, '\t');
        this.showTopics = false;
    }
    filterTopicsNames() {
        this.filteredTopicsNames = [];
        this.topics.forEach(element => {
            if (element.includes(this.topicName.toLowerCase())) {
                this.filteredTopicsNames.push(element);
            }
        });
        this.filteredTopicsNames.sort();
    }
}
