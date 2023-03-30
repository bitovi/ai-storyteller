import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import axios from 'axios';
import Select from 'react-select'
import { Carousel, Form, Button, Modal, Input } from 'rsuite';
import 'rsuite/styles/index.less'; // or 'rsuite/dist/rsuite.min.css'
import ReactAudioPlayer from 'react-audio-player';

var renderedStory = '';

//TODO: pull from config
const apiRoot = "http://localhost:3001";

const promptOptionsResponse = await axios.get(`${apiRoot}/getPromptOptions`, {port: 3001});
const promptOptions = promptOptionsResponse.data;

class StoryContainer extends React.Component {
  constructor(props) {
    super(props);

    this.state = { open: false };
  }

  handleClose = () => {
    if (typeof this.props.onCloseClick === 'function') {
      this.props.onCloseClick();
    }
  }
  componentDidUpdate = (prevProps, prevState, snapshot) => {
    if(prevProps.story !== this.props.story){
      this.setState({
        ...this.state,
        open: !!(this.props.story && this.props.story.length)
      });
    }
  }

  render() {
    return <div>
      <Modal overflow={true} open={this.state.open} size="full">
        <Modal.Header>
          <Modal.Title>Here's your story!</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div>
            {this.props.story}
          </div>

          <Carousel
            shape="bar"
            style={{width:"256px", height: "256px"}}
          >
          {this.props.images && this.props.images.map(image => {
            return <img src={image.image_url} width="256" height="256" />
          })}
          </Carousel>
          <ReactAudioPlayer
            src={`${apiRoot}/${this.props.audioFile}`}
            autoPlay
            controls
          />
        </Modal.Body>
        <Modal.Footer>
          <Button onClick={this.handleClose} appearance="primary">
            Ok
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  }
}


/* A.I. Prompt starter:
write a react.js class that takes the following input data:
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
and generates a json serializable form that can be sent to a server via an http post

The form should be based on the input data.
for example, lists such as `characters` from the example input data should be converted into a set of checkboxes
objects should be converted to buttons that show the `value` and the `prompt` of the object

the code should be well commented
*/
class StoryForm extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      storylines: [],
      storytellers: ['dr-seuss'],
      characters: [],
      stories: 'children',
      additionalDetails: '',
      numPictures: '3',
      renderedStory: "",
      isLoading: false,
      storyContainerVisible: false,
      audioFile: ""
    };

    console.log("promptOptions", promptOptions);
  }

  handleFormSubmit = async (event) => {
    console.log("in handleFormSubmit - event", event)
    // event.preventDefault();

    this.setState({
      ...this.state,
      isLoading: true
    })
    try{
      const response = await axios.post(`http://localhost:3001/createStory`, {
        ...this.state,
        numPictures: undefined,
        renderedStory: undefined,
        isLoading: undefined,
        storyContainerVisible: undefined,
        images: undefined,
        audioFile: undefined
      },{
        port: 3001
      });
      const content = response.data.story.content;
      this.setState({
        ...this.state,
        renderedStory: content,
        isLoading: false,
        storyContainerVisible: !!(renderedStory && renderedStory.length),
        images: response.data.images,
        audioFile: response.data.audioFile
      })
    }catch(e){
      console.log("something went wrong", e);
      this.setState({
        ...this.state,
        isLoading: false
      });
    }
  };

  render() {
    return (
      <div>
        <h1>AI Storyteller</h1>
        <StoryContainer
          story={this.state.renderedStory}
          visible={this.state.storyContainerVisible}
          images={this.state.images}
          audioFile={this.state.audioFile}
          onCloseClick={() => {this.setState({
            ...this.state,
            storyContainerVisible: false,
            renderedStory: "",
            images: []
          })}}
        />
        <Form>
          <div>
            <Form.Group>
              <Form.ControlLabel>Select your Storyteller</Form.ControlLabel>
              <Select
                options={Object.keys(promptOptions.storytellers).map(storytellerKey => {
                  return {
                    value: promptOptions.storytellers[storytellerKey].value,
                    label: promptOptions.storytellers[storytellerKey].prompt,
                  }
                })}
                isMulti={true}
                onChange={(newValue) => {
                  this.setState({
                    ...this.state,
                    storytellers: newValue.map(item => item.value)
                  })
                }}
              />
            </Form.Group>
          </div>
          <div>
            <Form.Group>
              <Form.ControlLabel>Select your Storyline</Form.ControlLabel>
              <Select
                options={Object.keys(promptOptions.storylines).map(storylineKey => {
                  return {
                    value: promptOptions.storylines[storylineKey].value,
                    label: promptOptions.storylines[storylineKey].prompt,
                  }
                })}
                isMulti={true}
                onChange={(newValue) => {
                  this.setState({
                    ...this.state,
                    storylines: newValue.map(item => item.value)
                  })
                }}
              />
            </Form.Group>
          </div>
          <div>
            <Form.Group>
              <Form.ControlLabel>Select your Characters</Form.ControlLabel>
              <Select
                options={Object.keys(promptOptions.characters).map(characterKey => {
                  return {
                    value: promptOptions.characters[characterKey].value,
                    label: promptOptions.characters[characterKey].prompt,
                  }
                })}
                isMulti={true}
                onChange={(newValue) => {
                  this.setState({
                    ...this.state,
                    characters: newValue.map(item => item.value)
                  })
                }}
              />
            </Form.Group>
          </div>
          <div>
            <Input
              as="textarea"
              rows={3}
              placeholder="Enter additional details..."
              onChange={(newValue) => {
                  this.setState({
                    ...this.state,
                    additionalDetails: newValue
                  })
                }}
            />
          </div>

          <Button
            as="button"
            disabled={this.state.isLoading}
            loading={this.state.isLoading}
            type="submit"
            appearance="primary"
            size="lg"
            onClick={this.handleFormSubmit}
          >
            Create
          </Button>
        </Form>
      </div>
    );
  }
}

const App = () => {


  return (
    <StoryForm />
  );
};

ReactDOM.render(<App />, document.getElementById('app'));
