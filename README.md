# AI Storyteller app

This will start the Express server and the React app will be accessible at http://localhost:3000.
```
OPENAI_API_KEY=<your API key here> \
docker-compose up
```


> Note: This is a basic implementation of the AI Storyteller app and it can be further improved in terms of user interface, error handling, and security. Also, you should not share your OpenAI API key with anyone else.


Also, here's the prompt that generated this app entirely from GPT Chat:
---
create an ai storyteller app in react and express js

There should be a `public/index.html` file which includes the react js code to render the app.

There should be a front-end file called `public/app.js` built with React
The front end should have a form with the following inputs:

storyline - type: textarea
characters - type: multi select, options: merlin, fawn, luna, wilbur, dark green elsa (a green version of elsa from the movie frozen who controls plants and nature instead of water and ice)
number of pictures - type: radio, options: 3, 5, 10

There should be a create button that sends the json serialized data from the above inputs to the api at `/api/createStory`

There should be a backend file called `server.js` which runs an express.js server on port `3000`. 

The server should host the `public/` directory at the root of the server (i.e. `/`)
The server should expose the following endpoint:
`/api/createStory` - this endpoint should accept the payload from the front-end's button submission. it will then call a function which will generate a prompt to send to openai and store the result in a variable called `prompt`.  the generated prompt will be "create a children's story with the following storyline: {{formData.storyline}}  and the following characters {{formData.characters.join(',')}}"
the endpoint function will then use the `prompt` variable to send to openai's api and store the result in a variable called `story`.

There should be a `Dockerfile` which starts the express server and exposes port 3000. the working directory should be set to `/app`

there should be a docker-compose file which points to the repo's Dockerfile and also mounts the root of the repo to `/app` in the container.
---

css generation prompt
---
write a short css block for this html:
```
<form><div><label for="storyline">Storyline:</label><textarea id="storyline"></textarea></div><div><label for="characters">Characters:</label><select multiple="" id="characters"><option value="merlin">Merlin</option><option value="fawn">Fawn</option><option value="luna">Luna</option><option value="wilbur">Wilbur</option><option value="dark-green-elsa">Dark Green Elsa</option></select></div><div><label>Number of Pictures:</label><div><label for="3"><input type="radio" id="3" name="numPictures" value="3" checked="">3</label><label for="5"><input type="radio" id="5" name="numPictures" value="5">5</label><label for="10"><input type="radio" id="10" name="numPictures" value="10">10</label></div></div><button type="submit">Create</button></form>
```
it should be short and concise

it should be wrapped in `<style>` tags

It should have a green and black, high contrast theme
---

app build supplemented with the following resources
- https://jsramblings.com/creating-a-react-app-with-webpack/