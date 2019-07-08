/* eslint-disable no-prototype-builtins */
var express = require('express');
var ip = require("ip");
var fetchTimeout = require('fetch-timeout');

/*
This app creates a simple HTTP listener and responds to GET / requests by
displaying basic info about the container (e.g. IP address) and, optionally, 
ECS metadata if the container is running on EC2 or Fargate via ECS.

The app will has an optional interface that makes a GET request to the URL
specified by the ?targetAttribute= parameter in the GET / request, if
present. Though not used now, this instrumentation might be adapted to show
service-to-service or intra-pod / intra-task communication. 
*/

const PORT = process.env.PORT || 8080;
const app = express();
const addr = ip.address();

const SERVICE_NAME = process.env.SERVICE_NAME || 'NOT SPECIFIED';
const NEWLINE_REGEX = /\n/g;                 // Used to convert newlines to <br/> tags for HTML
const SPACE_MARKER = '!!SPACE!!';            // Used to convert newlines to <br/> tags for HTML
const SPACE_REGEX = /!!SPACE!!/g;            // Used to convert newlines to <br/> tags for HTML
const HEALTH_CHECK_REGEX = /\/healthCheck$/  // match any string ending in "/healthCheck"

async function main() {

    app.get(HEALTH_CHECK_REGEX, async function (req, res) {
        let message = {
            status: 200,
            statusText: `I am a healthy container of the ${SERVICE_NAME} service!`
        };
        res.send(message);
    });

    app.get('/*', async function (req, res) {
        
        let message = getIntroMessage(req);
        message += await getTargetAddressMessage(req.query);
        message += await getEcsMetadataMessage();
        message += await getKubernetesMetadataMessage();
        res.send(message);
    });
    
    app.listen(PORT, function () {
      console.log(`app listening on port ${PORT}!\n`);
    });
}

function getKubernetesMetadataMessage() {

    var message = '';
    var env = process.env;
    if (env.hasOwnProperty('MY_POD_NAME')) {
        message += `
            Kubernetes metadata retrieved from env vars:<br/>
            <ul>
                <li>Pod Info
                    <ul>
                        <li>Node name: ${env.MY_NODE_NAME}</li>
                        <li>Pod name: ${env.MY_POD_NAME}</li>
                        <li>Pod namespace: ${env.MY_POD_NAMESPACE}</li>
                        <li>Pod IP: ${env.MY_POD_IP}</li>
                        <li>Pod service account: ${env.MY_POD_SERVICE_ACCOUNT}</li>
                    </ul>
                </li>
                <li>Container Info
                <ul>
                    <li>CPU request: ${env.MY_CPU_REQUEST}</li>
                    <li>CPU limit: ${env.MY_CPU_LIMIT}</li>
                    <li>Memory request: ${env.MY_MEM_REQUEST}</li>
                    <li>Memory limit: ${env.MY_MEM_LIMIT}</li>
                </ul>
            </li>
        </ul>
        </br><br/>
        `;
    }
    else {
        message += `This is not a Kubernetes task based on inspection of env vars.<br/><br/>`;
    }

    return message;
}

async function getEcsMetadataMessage() {
    
    const ECS_METADATA_ENDPOINT = process.env.ECS_CONTAINER_METADATA_URL || 'http://169.254.170.2/v2/metadata';
    var ecsMetadata = await fetchData('GET', ECS_METADATA_ENDPOINT);
    var message = '';
    
    if (ecsMetadata) {
        ecsMetadata = jsonToHtml(JSON.parse(ecsMetadata));
        message += `ECS metadata retrieved from ${ECS_METADATA_ENDPOINT}:<br/>`;
        message += `${ecsMetadata}<br/><br/>`;
    } 
    else {
        message += `This is not an ECS task because call to ${ECS_METADATA_ENDPOINT} timed out.<br/><br/>`;
    }
    return message;
}


function getIntroMessage(req) {

    var message =
        `I am a healthy container of the ${SERVICE_NAME} service `
        + `listening on ${ req.protocol } port ${PORT}.<br />`
        + `My internal container IP address is ${addr}<br/><br/>`
        + `Received ${req.method} request from ${req.ip} for path `
        + `${ req.path } with query params: <br/>`
        + `${jsonToHtml(req.query)}<br/></br>`
    ;
    console.log(
        `${req.method} ${req.path} from ${req.ip}, query params = `
        + `${JSON.stringify(req.query)}`
    );
    return message;
}


async function getTargetAddressMessage(query) {

    let message = '';

    if (query.hasOwnProperty('targetAddress')) {
        let targetAddress = query.targetAddress;

        message = `<b>GET ${targetAddress}:</b><br/>`;
        let targetResponse = await fetchData('GET', targetAddress);
        
        if (targetResponse) {
            targetResponse = parseStringToJson(targetResponse);
            targetResponse = jsonToHtml(targetResponse);
            message += `${targetResponse}<br/><br/>`;
        }
        else {
            message += `<b>Error: </b>${targetAddress} is not reachable or request timed out.<br/></br>`;
        }
    }
    
    return message;

}

function parseStringToJson(string) {

    // return the original string if it can't be parsed
    try {
        return JSON.parse(string);
    }
    catch (e) {
        return {
            targetResponse: string
        };
    }
}

function jsonToHtml(json) {

    var html = JSON.stringify(json, null, SPACE_MARKER);
    html = escapeHTML(html);
    html = newlineToHtml(html);
    html = spaceToHtml(html);
    html = setHtmlFont(html, 'Courier New');
    return html;
}

function setHtmlFont(html, font) {
    return `<font face="${font}">${html}</font>`;
}

function newlineToHtml(source) {
    return source.replace(NEWLINE_REGEX, "<br/>");
}

function HtmltoNewline(source) {
    return source.replace("<br/>", "\n");
}

function spaceToHtml(source) {
    return source.replace(SPACE_REGEX, "&nbsp;&nbsp;");
}

async function fetchData(method, target) {

    try {
        var params = {
            method: method,
            headers: {
                'Accept': 'application/text',
                'Content-Type': 'application/text'
            }
        };
        // timeout after 2000 ms
        var response = await fetchTimeout(target, params, 2000);

        if (response.status !== 200) {
            throw new Error('Status code not OK', response.status);
        }

        return response.text();
    }
    catch (error) {
        return false;
    }
}

(async () => {
    try {
        await main();
    } catch (e) {
        console.log('Unhandled error:\n' + e);
    }
})();

function escapeHTML(s) { 
    return s.replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
}