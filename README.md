# CFC2020
CFC2020 submission - Covid-19 Tracker Solution


If expecting to run this application locally, please continue by installing [Node.js](https://nodejs.org/en/) runtime and NPM. If your system requires multiple versions of Node for other projects, we'd suggest using [nvm](https://github.com/creationix/nvm) to easily switch between Node versions. NVM can be installed with the following commands
```
curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.33.11/install.sh | bash
# Place next three lines in ~/.bash_profile
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"  # This loads nvm bash_completion
nvm install v8.9.0
nvm use 8.9.0
```

To run the UI locally, we'll need to install a few node libraries which are listed in our `package.json` file.
- [Leaflet.js](https://leafletjs.com/): Open source library for interactive mapping
- [MQTT](http://mqtt.org/): Client package to subscribe to Watson IoT Platform and handle incoming messages

Install the listed node packages by running `npm install` in the project root directory.
```
npm install
```

Start the application with
```
node app.js
```
## Application Workflow Diagram
Please refer Docs/Aarogya_Rekha_Solution_Process_Flow.pdf

## Application Technical Architecture Diagram
Please refer Docs/Aarogya_Rekha_Technical_Architecture.pdf

## Solution Video link
https://www.youtube.com/watch?v=sllZc2HCyCg&feature=youtu.be
