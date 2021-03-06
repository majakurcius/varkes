import * as config from "@varkes/configuration"
const LOGGER = config.logger("api-server")
import * as express from "express"
import * as services from "../services";
import { api, connection } from "@varkes/app-connector"

var varkesConfig: config.Config;

function getAll(req: express.Request, res: express.Response) {
    LOGGER.debug("Getting all Local APIs")
    let apis = []
    let configApis = varkesConfig.apis;
    if (configApis) {
        for (let i = 0; i < configApis.length; i++) {
            let api = configApis[i]
            let metadata: any = services.fillServiceMetadata(varkesConfig, api, getOrigin(req))
            metadata.api = {}
            metadata.id = api.name
            apis.push(metadata)
        }
    }
    let configEvents = varkesConfig.events;
    if (configEvents) {
        for (let i = 0; i < configEvents.length; i++) {
            let event = configEvents[i];
            let metadata: any = services.fillEventData(varkesConfig, event)
            metadata.events = {}
            metadata.id = event.name;
            apis.push(metadata);
        }
    }
    res.status(200).send(apis);
}

function getLocalApi(req: express.Request, res: express.Response) {
    LOGGER.debug("Getting Local API")
    let apiname = req.params.apiname;
    let api = varkesConfig.apis.find((x: config.API) => x.name == apiname);
    if (api) {
        let serviceMetadata: any = services.fillServiceMetadata(varkesConfig, api, getOrigin(req))
        serviceMetadata.id = apiname;
        res.status(200).send(serviceMetadata);
    }
    else {
        let event = varkesConfig.events.find((x: config.Event) => x.name == apiname);
        if (event) {
            let eventMetadata: any = services.fillEventData(varkesConfig, event)
            eventMetadata.id = apiname;
            res.status(200).send(eventMetadata);
        }
        else {
            let message = "api " + apiname + " does not exist";
            LOGGER.error(message);
            res.status(404).send({ error: message })
        }
    }
}

function getOrigin(req: express.Request) {
    let result
    if (req.body.baseUrl && !req.body.baseUrl.match(/http(s)?:\/\//)) {
        result = req.protocol + req.body.baseUrl
    } else {
        result = req.body.baseUrl || req.headers.origin || req.headers.referer || req.protocol + "://" + req.headers.host
    }
    result = result.replace(/\/$/, "")
    return result
}

async function registerAll(req: express.Request, res: express.Response) {
    LOGGER.debug("Registering all Local APIs")
    let err = assureConnected()
    if (err) {
        res.status(400).send({ error: err })
    }
    try {
        let registeredAPIs = await api.findAll();
        services.createServicesFromConfig(getOrigin(req), varkesConfig, registeredAPIs)
        LOGGER.debug("Auto-registering %d APIs and %d Event APIs", varkesConfig.apis ? varkesConfig.apis.length : 0, varkesConfig.events ? varkesConfig.events.length : 0)
        res.status(200).send(connection.info())
    }
    catch (error) {
        LOGGER.error("Failed to register all Local APIs: %s", error)
        res.status(500).send({ error: error.message })
    }
}

function getStatus(req: express.Request, res: express.Response) {
    LOGGER.debug("Getting Registration Status")
    res.status(200).send(services.getStatus());
}

async function register(req: express.Request, res: express.Response) {
    LOGGER.debug("Register Local API %s", req.params.apiname)

    let err = assureConnected()
    if (err) {
        LOGGER.error("Failed to register all APIs: %s")
        res.status(400).send({ error: err })
    } else {
        let apiName = req.params.apiname;
        let apis = varkesConfig.apis;
        let events = varkesConfig.events;
        let apiFound = false;
        let serviceMetadata: any;
        for (let i = 0; i < apis.length; i++) {
            let apiEntry = apis[i];
            if (apiEntry.name == apiName) {
                serviceMetadata = services.fillServiceMetadata(varkesConfig, apiEntry, getOrigin(req));
                apiFound = true;
                break;
            }
        }
        for (let i = 0; i < events.length && !apiFound; i++) {
            let event = events[i];
            if (event.name == apiName) {
                serviceMetadata = services.fillEventData(varkesConfig, event);
                break;
            }
        }
        try {
            let registeredAPIs = await api.findAll();
            let reg_api;
            if (registeredAPIs.length > 0)
                reg_api = registeredAPIs.find((x: any) => x.name == serviceMetadata.name)
            if (!reg_api) {
                let result = await api.create(serviceMetadata)
                res.status(200).send(result);
            } else {
                let result = await api.update(serviceMetadata, reg_api.id)
                res.status(200).send(result);
            }
        } catch (error) {
            LOGGER.error("Failed to register API '%s' with error: %s", req.params.apiname, error)
            res.status(500).send({ error: error.message });
        }
    }
}

function assureConnected() {
    if (!connection.established()) {
        return "Not connected to a kyma cluster, please re-connect"
    }
    return null
}

function router(config: config.Config) {
    let apiRouter = express.Router()
    varkesConfig = config
    apiRouter.get("/apis", getAll)
    apiRouter.post("/registration", registerAll)
    apiRouter.get("/registration", getStatus)
    apiRouter.get("/apis/:apiname", getLocalApi)
    apiRouter.post("/apis/:apiname/register", register)
    return apiRouter
}

export { router }