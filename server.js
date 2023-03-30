const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs'); 
const path = require('path'); 
const https = require('https'); 
const { v4: uuidv4 } = require('uuid');
var cors = require('cors');
const moment = require('moment');
const { Configuration, OpenAIApi } = require("openai");
const { request, json } = require('express');
const textToSpeech = require('@google-cloud/text-to-speech');
const util = require('util');




const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);
const app = express();
app.use(express.static('build'));
app.use('/out', express.static('out'))
app.use(bodyParser.json());
app.use(cors())
const ttsClient = new textToSpeech.TextToSpeechClient();

var globalPromptsObj;

//https://stackoverflow.com/questions/11944932/how-to-download-a-file-with-node-js-without-using-third-party-libraries
var download = function(url, dest, cb) {
  var file = fs.createWriteStream(dest);
  https.get(url, function(response) {
    response.pipe(file);
    file.on('finish', function() {
      file.close(cb);
    });
  });
}

async function convertTextToSpeech({text,outputFile}) {

  console.log("convert tts", text)
  // Construct the request
  const request = {
    input: {text},
    // Select the language and SSML voice gender (optional)
    voice: {languageCode: 'en-US', ssmlGender: 'NEUTRAL'},
    // select the type of audio encoding
    audioConfig: {audioEncoding: 'MP3'},
  };

  // Performs the text-to-speech request
  const [response] = await ttsClient.synthesizeSpeech(request);

  // Write the binary audio content to a local file
  const writeFile = util.promisify(fs.writeFile);
  await writeFile(outputFile, response.audioContent, 'binary');
  console.log(`Audio content written to file: ${outputFile}`);
}


/* function: appendToPrompt
A.I. Prompt starter:
You are a Rockstar NodeJS Developer.

Please write a nodejs function called `appendToPrompt` that has the following input as an object:
- promptId: string
- title: string
- content: string
- outputDir: string, default="out"

here's an exammple usage of the function:
```
appendToPrompt({
  promptId: "11111",
  title: "some prompt title"
})
```

if directory specified by `outputDir` is not found, create the directory.

promptId is optional.
if promptId is not defined, generate a unique string, and set it to a variable.

the function should then use the promptId to look for a corresponding file with a `.promptlog` extension in the outputDir.
for example, if promptId is "11111", and outputDir is "out", 
then the function should try to find a file at "out/11111.promptlog".

if the file is not found, create it.

then the function will append the `title` and `content` to the file with the following format:
```
==============
{title}
--------------
{content}
==============
```

the function should return the promptId
the function should be well commented and formatted
*/
/**
 * Appends the given title and content to the prompt log file with the given prompt ID
 * @param {Object} options - The options object
 * @param {string} [options.promptId] - The ID of the prompt, will generate a new ID if not provided
 * @param {string} options.title - The title of the prompt
 * @param {string} options.content - The content of the prompt
 * @param {string} [options.outputDir="out"] - The output directory for the prompt log file
 * @returns {string} - The ID of the prompt
 */
function appendToPrompt(options) {
  // Destructure the options object
  const { promptId, title, content, outputDir = 'out' } = options;

  // Generate a new prompt ID if not provided
  //const id = promptId || uuidv4();
  const id = promptId || moment().format("YYYY-MM-DD-HHmmss-SSS") + "-" + uuidv4();


  // Define the path to the prompt log file
  const promptLogPath = path.join(outputDir, `${id}/prompt.log`);

  // Create the output directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
  }
  if (!fs.existsSync(`${outputDir}/${id}`)) {
    fs.mkdirSync(`${outputDir}/${id}`);
  }

  // Create the prompt log file if it doesn't exist
  if (!fs.existsSync(promptLogPath)) {
    fs.writeFileSync(promptLogPath, '');
  }

  // Format the title and content
  const formattedContent = `
==============
${title}
--------------
${content}
==============
`;

  console.log(`
output to file (${promptLogPath}):
${formattedContent}
`);

  // Append the title and content to the prompt log file
  fs.appendFileSync(promptLogPath, formattedContent);


  // Return the prompt ID
  return id;
}


/* function: getPromptsFromFilesystem
A.I. Prompt starter:
write a nodejs function that returns an object like this:
```
{
  storylines: {
    value: "park",
    prompt: "The characters go on a trip to the park",
    file: "prompts/stories/park.prompt"
  },
  characters: [{
    value: "merlin",
    prompt: "Merlin is a grumpy carin terrier with magical powers",
    file: "prompts/characters/merlin.prompt"
  },{
    value: "fawn",
    prompt: "Fawn is a baby deer who is sweet and cuddly",
    file: "prompts/stories/fawn.prompt"
  }],
  storytellers: {
    value: "dr-seuss",
    prompt: "You are Dr. Seuss writing a story for children age 5-7",
    file: "prompts/storytellers/dr-seuss.prompt"
  },
  stories: {
    value: "children",
    prompt: "write a childrens story for children age 5-7 that includes the characters",
    file: "prompts/stories/children.prompt"
  }
}
```
the object should be generated based on reading all `.prompt` files in a given directory path (provided to the function by `promptsDir`)
the directory that `promptsDir` points to should look like this:
```
prompts/
  characters/
    merlin.prompt
    fawn.prompt
  storylines/
    park.prompt
  stories/
    children.prompt
```

The value of the "file" key for each of the items in the returned object
should be the path (relative to a given promptsDir) of a file in the given PromptsDir that corresponds to the key's path in the object.

so, the value of the "stories.file" key in the returned object corresponds to `prompts/stories/children.prompt`

the value of the "prompt" key for each of the items in the returned object
should be the contents of a file found in a given directory.

The function should work for any given `prompts/` directory structure
The function should be well commented
*/

/**
 * Returns an object containing all the prompts and their associated files,
 * found in a given prompts directory.
 * 
 * @param {String} promptsDir the directory containing the prompts files
 * @returns {Object} an object containing prompts and associated files
 */
const getPromptsFromFilesystem = (promptsDir="prompts") => {
  if(globalPromptsObj){
    return globalPromptsObj;
  }

  // Create an object to hold the prompts
  let prompts = {};
  
  // Get a list of all the files in the given prompts directory
  const categories = fs.readdirSync(promptsDir);
  console.log("categories",categories);
  categories.forEach((category) => {
    const files = fs.readdirSync(`${promptsDir}/${category}`);
    console.log("category", category);
    console.log("  files", files);
    // Iterate over the list of files in the prompts directory
    files.forEach((file) => {
      // Get the path of the file
      const filePath = path.join(promptsDir, category, file);
      console.log("  filepath", filePath);
      // Read the file
      const fileContents = fs.readFileSync(filePath, 'utf-8');
      console.log("fileContents", fileContents)
      
      // Get the file's type from the file name
      const type = path.basename(file, '.prompt');
      
      // Add the category to the prompts object
      if (!prompts[category]) {
        prompts[category] = {};
      }
      //add the type to the category
      if (!prompts[category][type]){
        prompts[category][type] = {};
      }

      // Set the prompt's value and file
      prompts[category][type].value = type;
      prompts[category][type].prompt = fileContents;
      prompts[category][type].file = filePath;
    });
  });


  globalPromptsObj = prompts;
  return globalPromptsObj;
}

// Declare a flatten function that takes
// object as parameter and returns the
// flatten object
const flattenObj = (ob) => {

	// The object which contains the
	// final result
	let result = {};

	// loop through the object "ob"
	for (const i in ob) {

		// We check the type of the i using
		// typeof() function and recursively
		// call the function again
		if ((typeof ob[i]) === 'object' && !Array.isArray(ob[i])) {
			const temp = flattenObj(ob[i]);
			for (const j in temp) {

				// Store temp in result
				result[i + '.' + j] = temp[j];
			}
		}

		// Else store ob[i] in result directly
		else {
			result[i] = ob[i];
		}
	}
	return result;
};


/* function: getPromptsFromFormData
A.I. Prompt starter:
write a nodejs function that takes formData like this:
```
{
  storylines: "park",
  characters: ["merlin", "fawn"],
  storyteller: "dr-seuss",
  stories: "children"
}
```

and returns an object like this:
```
{
  storylines: {
    value: "park",
    prompt: "The characters go on a trip to the park",
    file: "prompts/stories/park.prompt"
  },
  characters: [{
    value: "merlin",
    prompt: "Merlin is a grumpy carin terrier with magical powers",
    file: "prompts/characters/merlin.prompt"
  },{
    value: "fawn",
    prompt: "Fawn is a baby deer who is sweet and cuddly",
    file: "prompts/stories/fawn.prompt"
  }],
  storytellers: {
    value: "dr-seuss",
    prompt: "You are Dr. Seuss writing a story for children age 5-7",
    file: "prompts/storytellers/dr-seuss.prompt"
  },
  stories: {
    value: "children",
    prompt: "write a childrens story for children age 5-7 that includes the characters",
    file: "prompts/stories/children.prompt"
  }
}
```

The value of the "file" key for each of the items in the returned object
should be the path (relative to a given promptsDir) of a file in the given PromptsDir that corresponds to the key's path in the object.

the structure of the directory should look like this:
```
prompts/
  characters/
    merlin.prompt
    fawn.prompt
  storylines/
    park.prompt
  stories/
    children.prompt
```

so, the value of the "stories.file" key in the returned object corresponds to `prompts/stories/children.prompt`

the value of the "prompt" key for each of the items in the returned object
should be the contents of a file found in a given directory.

The function should work for any given formData properties
The function should be well commented
*/

// takes in formData object and a promptsDir string
// returns an object with file paths and prompts specific to the given formData
// and relative to the given promptsDir
function getPromptsFromFormData(formData, promptsDir="prompts") {
  // initialize object to be returned
  const promptsObj = {};

  // get keys of formData
  const dataKeys = Object.keys(formData);

  // loop over keys
  dataKeys.forEach(dataKey => {
    // initialize object for the dataKey
    promptsObj[dataKey] = {};

    // get the value of the dataKey
    const dataValue = formData[dataKey];

    // if the value of dataValue is an array
    // loop over the array and create an item for each element
    if (Array.isArray(dataValue)) {
      promptsObj[dataKey] = dataValue.map(itemValue => {
        console.log("itemValue", itemValue);
        // create an item object
        let itemObj = { value: itemValue };

        // get the file path (relative to given promptsDir)
        const filePath = `${promptsDir}/${dataKey}/${itemValue}.prompt`;

        // set the file key in the itemObj
        itemObj.file = filePath;

        // get the contents of the file
        console.log("reading fileContents", filePath);
        const fileContents = fs.readFileSync(filePath, 'utf8');
        console.log("fileContents", fileContents)

        // set the prompt key in the itemObj
        itemObj.prompt = fileContents;

        // return the itemObj
        return itemObj;
      });
    } else {
      // create an object for the dataKey
      let itemObj = { value: dataValue };

      // get the file path (relative to given promptsDir)
      const filePath = `${promptsDir}/${dataKey}/${dataValue}.prompt`;

      // set the file key in the itemObj
      itemObj.file = filePath;

      // get the contents of the file
      const fileContents = fs.readFileSync(filePath, 'utf8');

      // set the prompt key in the itemObj
      itemObj.prompt = fileContents;

      // set the dataKey in the promptsObj
      promptsObj[dataKey] = itemObj;
    }
  });

  // return the promptsObj
  return promptsObj;
}

app.get('/up', async (req, res) => {
  res.send('up');
});

app.get('/getPromptOptions', async (req, res) => {
  globalPromptsObj = getPromptsFromFilesystem();
  console.log("globalPromptsObj", globalPromptsObj);
  res.send(JSON.stringify(globalPromptsObj));
});

app.post('/createStory', async (req, res) => {
  const outputDir = "out";
  const requestBody = req.body;

  // Pull off properties that shouldn't be sent to getPromptsFromFormData
  const additionalDetails = requestBody.additionalDetails;
  delete requestBody.additionalDetails;

  const promptsObj = getPromptsFromFormData(requestBody, 'prompts');

  const promptId = appendToPrompt({ 
    title: "promptsObject",
    content: JSON.stringify(promptsObj),
    outputDir
  });

  const storyPrompt = promptsObj.stories.prompt;
  const prompt = `
  ${storyPrompt}

  Please ensure the following details are included in the story:
  ---
  ${additionalDetails}
  ---

  Here's the story data:
  ---
  ${JSON.stringify(flattenObj(promptsObj))}
  ---
  for each of the "prompts" values in the given story data, create a token for yourself to use interpolating promts.
  for example, anywhere above that you encounter something like: "\${storytellers.prompt}" (without the quotes), 
  you should swap it out for the value in the given story data { storytellers: { prompt: "foo" }}. ("foo" in this case)
  Do this same thing any for all tokens in the given story data.
  `;

  appendToPrompt({
    promptId,
    title: "Full prompt to send to the LLM",
    content: prompt,
    outputDir
  });

  const model = "gpt-3.5-turbo";
  const role = "user";

  const mockBackend = false;

  let story = "";
  if(mockBackend){
    story = {"content":"mocked story"}
  }else{
    const completion = await openai.createChatCompletion({
      model: model,
      //TODO: leverage more messages.  a message per stored prompt, perhaps?
      messages: [{role: role, content: prompt}],
      temperature: 0.5
    });
    story = completion.data.choices[0].message;
  }

  appendToPrompt({
    promptId,
    title: "story",
    content: story.content,
    outputDir
  });

  //TODO: numPictures = promptsObj.numPictures or turn into full prompt
  var numPictures = 3;
  const promptKeyPoints = `
  give the top ${numPictures} key points following story: ${story.content}
  an example of the output is (for 3 pictures):
  ---
  ["characters go to paris", "merlin orders pastries for everyone", "they enjoy their time immensely"]
  ---
  ensure the number of items in the list equals ${numPictures}.
  ensure the output contains only a list and no other words or content. Also, no newlines, please.
  I want to save your response in a JS variable.
  The output should be a single array of strings, and each string in the array is one of the key points you generate.
  make each key point very descriptive because I'd like to feed it into Dall-E, an ai image generation model
  that takes prompts and outputs pictures.
  The images should be consistent with each other, but otherwise, feel free to embelish with details
  each prompt should include a description about the characters involved in the corresponding key point
`;
  appendToPrompt({
    promptId,
    title: "promptKeyPoints",
    content: promptKeyPoints,
    outputDir
  });

  let keyPoints = "";
  if(mockBackend){
    keyPoints = "mocked key points"
  }else{
    const completionKeyPoints = await openai.createChatCompletion({
      model: model,
      messages: [{role: role, content: promptKeyPoints}],
      temperature: 0.5
    });
    keyPoints = completionKeyPoints.data.choices[0].message;
  }


  appendToPrompt({
    promptId,
    title: "keyPoints",
    content: keyPoints.content,
    outputDir
  });

  // //this could be risky as it converts ML response to code/data...
  // var keyPointsAr = JSON.parse(keyPoints.content.replace(/(?:\r\n|\r|\n)/g, '').trim());

  const images = [];
  for(let i = 0; i < numPictures; i++){
    console.log("creating image for", i);
    let imagePrompt = `Here are ${numPictures} prompts:
---
${JSON.stringify(keyPoints.content)}.
---
Using item ${i} in the above prompts list, create an oil painting for a children's story
`
    const response = await openai.createImage({
      prompt: imagePrompt,
      n: 1,
      size: "512x512",
    });

    images.push({
      index: i,
      keyPoints: keyPoints,
      image_url: response.data.data[0].url 
    });
    console.log("downloading url", response.data.data[0].url)
    download(response.data.data[0].url, `${outputDir}/${promptId}/${i}.jpg`)
  }
  appendToPrompt({
    promptId,
    title: "images",
    content: JSON.stringify(images),
    outputDir
  });



  const audioFile = `${outputDir}/${promptId}/tts.mp3`;
  try{
    await convertTextToSpeech({text: story.content, outputFile: audioFile});
  }catch(e){
    console.log("error converting tts", e);
    res.status(500).send('There was an error');
  }

  console.log("story");
  console.log(story.content);
  console.log("keyPoints");
  console.log(keyPoints);
  console.log("images");
  console.log(images);
  res.json({ story, keyPoints, images, audioFile });

});

const port = process.env.API_PORT || 3001;
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});