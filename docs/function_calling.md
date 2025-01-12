Function calling
================

Connect models to external data and systems.

**Function calling** enables developers to connect language models to external data and systems. You can define a set of functions as tools that the model has access to, and it can use them when appropriate based on the conversation history. You can then execute those functions on the application side, and provide results back to the model.

Learn how to extend the capabilities of OpenAI models through function calling in this guide.

Experiment with function calling in the [Playground](/playground) by providing your own function definition or generate a ready-to-use definition.

Generate

Overview
--------

Many applications require models to call custom functions to trigger actions within the application or interact with external systems.

Here is how you can define a function as a tool for the model to use:

```python
from openai import OpenAI

client = OpenAI()

tools = [
  {
      "type": "function",
      "function": {
          "name": "get_weather",
          "parameters": {
              "type": "object",
              "properties": {
                  "location": {"type": "string"}
              },
          },
      },
  }
]

completion = client.chat.completions.create(
  model="gpt-4o",
  messages=[{"role": "user", "content": "What's the weather like in Paris today?"}],
  tools=tools,
)

print(completion.choices[0].message.tool_calls)
```

```javascript
import { OpenAI } from "openai";
const openai = new OpenAI();

const tools = [
  {
      type: "function",
      function: {
          name: "get_weather",
          parameters: {
              type: "object",
              properties: {
                  location: { type: "string" }
              },
          },
      },
  }
];

const response = await openai.chat.completions.create({
  model: "gpt-4o",
  messages: [{"role": "user", "content": "What's the weather like in Paris today?"}],
  tools,
});

console.log(response.choices[0].message.tool_calls);
```

This will return a function call that looks like this:

```json
[
  {
    "id": "call_12345xyz",
    "type": "function",
    "function": { "name": "get_weather", "arguments": "{'location':'Paris'}" }
  }
]
```

Functions are the only type of tools supported in the Chat Completions API, but the Assistants API also supports [built-in tools](/docs/assistants/tools).

Here are a few examples where function calling can be useful:

1.  **Fetching data:** enable a conversational assistant to retrieve data from internal systems before responding to the user.
2.  **Taking action:** allow an assistant to trigger actions based on the conversation, like scheduling meetings or initiating order returns.
3.  **Building rich workflows:** allow assistants to execute multi-step workflows, like data extraction pipelines or content personalization.
4.  **Interacting with Application UIs:** use function calls to update the user interface based on user input, like rendering a pin on a map or navigating a website.

You can find example use cases in the [examples](#examples) section below.

### The lifecycle of a function call

When you use the OpenAI API with function calling, the model never actually executes functions itself - instead, it simply generates parameters that can be used to call your function. You are then responsible for handling how the function is executed in your code.

Read our [integration guide](#integration-guide) below for more details on how to handle function calls.

![Function Calling diagram](https://cdn.openai.com/API/docs/images/function-calling-diagram.png)

### Function calling support

Function calling is supported in the [Chat Completions API](/docs/guides/text-generation), [Assistants API](/docs/assistants/overview), [Batch API](/docs/guides/batch) and [Realtime API](/docs/guides/realtime).

This guide focuses on function calling using the Chat Completions API. We have separate guides for [function calling using the Assistants API](/docs/assistants/tools/function-calling), and for [function calling using the Realtime API](/docs/guides/realtime#tool-calling).

#### Models supporting function calling

Function calling was introduced with the release of `gpt-4-turbo` on June 13, 2023. All `gpt-*` models released after this date support function calling.

Legacy models released before this date were not trained to support function calling.

Support for parallel function calling

Parallel function calling is supported on models released on or after Nov 6, 2023. This includes: `gpt-4o`, `gpt-4o-2024-08-06`, `gpt-4o-2024-05-13`, `gpt-4o-mini`, `gpt-4o-mini-2024-07-18`, `gpt-4-turbo`, `gpt-4-turbo-2024-04-09`, `gpt-4-turbo-preview`, `gpt-4-0125-preview`, `gpt-4-1106-preview`, `gpt-3.5-turbo`, `gpt-3.5-turbo-0125`, and `gpt-3.5-turbo-1106`.

You can find a complete list of models and their release date on our [models page](/docs/models).

Integration guide
-----------------

In this integration guide, we will walk through integrating function calling into an application, taking an order delivery assistant as an example. Rather than requiring users to interact with a form, we can let them ask the assistant for help in natural language.

We will cover how to define functions and instructions, then how to handle model responses and function execution results.

If you want to learn more about how to handle function calls in a streaming fashion, how to customize tool calling behavior or how to handle edge cases, refer to our [advanced usage](#advanced-usage) section.

### Function definition

The starting point for function calling is choosing a function in your own codebase that you'd like to enable the model to generate arguments for.

For this example, let's imagine you want to allow the model to call the `get_delivery_date` function in your codebase which accepts an `order_id` and queries your database to determine the delivery date for a given package. Your function might look something like the following:

```python
# This is the function that we want the model to be able to call
def get_delivery_date(order_id: str) -> datetime:
  # Connect to the database
  conn = sqlite3.connect('ecommerce.db')
  cursor = conn.cursor()
  # ...
```

```javascript
// This is the function that we want the model to be able to call
const getDeliveryDate = async (orderId: string): datetime => { 
  const connection = await createConnection({
      host: 'localhost',
      user: 'root',
      // ...
  });
}
```

Now that we know which function we wish to allow the model to call, we will create a “function definition” that describes the function to the model. This definition describes both what the function does (and potentially when it should be called) and what parameters are required to call the function.

The `parameters` section of your function definition should be described using JSON Schema. If and when the model generates a function call, it will use this information to generate arguments according to your provided schema.

If you want to ensure the model always adheres to your supplied schema, you can enable [Structured Outputs](#structured-outputs) with function calling.

In this example it may look like this:

```json
{
    "name": "get_delivery_date",
    "description": "Get the delivery date for a customer's order. Call this whenever you need to know the delivery date, for example when a customer asks 'Where is my package'",
    "parameters": {
        "type": "object",
        "properties": {
            "order_id": {
                "type": "string",
                "description": "The customer's order ID."
            }
        },
        "required": ["order_id"],
        "additionalProperties": false
    }
}
```

Next we need to provide our function definitions within an array of available “tools” when calling the Chat Completions API.

As always, we will provide an array of “messages”, which could for example contain your prompt or a back and forth conversation between the user and an assistant.

This example shows how you may call the Chat Completions API providing relevant tools and messages for an assistant that handles customer inquiries for a store.

```python
tools = [
  {
      "type": "function",
      "function": {
          "name": "get_delivery_date",
          "description": "Get the delivery date for a customer's order. Call this whenever you need to know the delivery date, for example when a customer asks 'Where is my package'",
          "parameters": {
              "type": "object",
              "properties": {
                  "order_id": {
                      "type": "string",
                      "description": "The customer's order ID.",
                  },
              },
              "required": ["order_id"],
              "additionalProperties": False,
          },
      }
  }
]

messages = [
  {
      "role": "system",
      "content": "You are a helpful customer support assistant. Use the supplied tools to assist the user."
  },
  {
      "role": "user",
      "content": "Hi, can you tell me the delivery date for my order?"
  }
]

response = openai.chat.completions.create(
  model="gpt-4o",
  messages=messages,
  tools=tools,
)
```

```javascript
const tools = [
  {
      type: "function",
      function: {
          name: "get_delivery_date",
          description: "Get the delivery date for a customer's order. Call this whenever you need to know the delivery date, for example when a customer asks 'Where is my package'",
          parameters: {
              type: "object",
              properties: {
                  order_id: {
                      type: "string",
                      description: "The customer's order ID.",
                  },
              },
              required: ["order_id"],
              additionalProperties: false,
          },
      },
  },
];

const messages = [
  {
      role: "system",
      content: "You are a helpful customer support assistant. Use the supplied tools to assist the user."
  },
  {
      role: "user",
      content: "Hi, can you tell me the delivery date for my order?"
  }
];

const response = await openai.chat.completions.create({
  model: "gpt-4o",
  messages,
  tools,
});
```

### Model instructions

While you should define in the function definitions how to call them, we recommend including instructions regarding when to call functions in the system prompt.

For example, you can tell the model when to use the function by saying something like: `"Use the 'get_delivery_date' function when the user asks about their delivery date."`

### Handling model responses

The model only suggests function calls and generates arguments for the defined functions when appropriate. It is then up to you to decide how your application handles the execution of the functions based on these suggestions.

If the model determines that a function should be called, it will return a `tool_calls` field in the response, which you can use to determine if the model generated a function call and what the arguments were.

Unless you customize the tool calling behavior, the model will determine when to call functions based on the instructions and conversation.

Read the [Tool calling behavior](#tool-calling-behavior) section below for more details on how you can force the model to call one or several tools.

#### If the model decides that no function should be called

If the model does not generate a function call, then the response will contain a direct reply to the user as a regular chat completion response.

For example, in this case `chat_response.choices[0].message` may contain:

```python
chat.completionsMessage(
  content='Hi there! I can help with that. Can you please provide your order ID?',
  role='assistant', 
  function_call=None, 
  tool_calls=None
)
```

```javascript
{
  role: 'assistant',
  content: "I'd be happy to help with that. Could you please provide me with your order ID?",
}
```

In an assistant use case you will typically want to show this response to the user and let them respond to it, in which case you will call the API again (with both the latest responses from the assistant and user appended to the `messages`).

Let's assume our user responded with their order id, and we sent the following request to the API.

```python
tools = [
  {
      "type": "function",
      "function": {
          "name": "get_delivery_date",
          "description": "Get the delivery date for a customer's order. Call this whenever you need to know the delivery date, for example when a customer asks 'Where is my package'",
          "parameters": {
              "type": "object",
              "properties": {
                  "order_id": {
                      "type": "string",
                      "description": "The customer's order ID."
                  }
              },
              "required": ["order_id"],
              "additionalProperties": False
          }
      }
  }
]

messages = []
messages.append({"role": "system", "content": "You are a helpful customer support assistant. Use the supplied tools to assist the user."})
messages.append({"role": "user", "content": "Hi, can you tell me the delivery date for my order?"})
messages.append({"role": "assistant", "content": "Hi there! I can help with that. Can you please provide your order ID?"})
messages.append({"role": "user", "content": "i think it is order_12345"})

response = client.chat.completions.create(
  model='gpt-4o',
  messages=messages,
  tools=tools
)
```

```javascript
const tools = [
  {
      type: "function",
      function: {
          name: "get_delivery_date",
          description: "Get the delivery date for a customer's order. Call this whenever you need to know the delivery date, for example when a customer asks 'Where is my package'",
          parameters: {
              type: "object",
              properties: {
                  order_id: {
                      type: "string",
                      escription: "The customer's order ID."
                  }
              },
              required: ["order_id"],
              additionalProperties: false,
          },
      },
  },
];

const messages = [];
messages.push({ role: "system", content: "You are a helpful customer support assistant. Use the supplied tools to assist the user." });
messages.push({ role: "user", content: "Hi, can you tell me the delivery date for my order?" });
messages.push({ role: "assistant", content: "Hi there! I can help with that. Can you please provide your order ID?" });
messages.push({ role: "user", content: "i think it is order_12345" });

const response = await client.chat.completions.create({
  model: 'gpt-4o',
  messages,
  tools,
});
```

#### If the model generated a function call

If the model generated a function call, it will generate the arguments for the call (based on the `parameters` definition you provided).

Here is an example response showing this:

```python
Choice(
  finish_reason='tool_calls', 
  index=0, 
  logprobs=None, 
  message=chat.completionsMessage(
      content=None, 
      role='assistant', 
      function_call=None, 
      tool_calls=[
          chat.completionsMessageToolCall(
              id='call_62136354', 
              function=Function(
                  arguments='{"order_id":"order_12345"}', 
                  name='get_delivery_date'), 
              type='function')
      ])
)
```

```javascript
{
  finish_reason: 'tool_calls',
  index: 0,
  logprobs: null,
  message: {
      content: null,
      role: 'assistant',
      function_call: null,
      tool_calls: [
          {
              id: 'call_62136354',
              function: {
                  arguments: '{"order_id":"order_12345"}',
                  name: 'get_delivery_date'
              },
              type: 'function'
          }
      ]
  }
}
```

#### Handling the model response indicating that a function should be called

Assuming the response indicates that a function should be called, your code will now handle this:

```python
# Extract the arguments for get_delivery_date
# Note this code assumes we have already determined that the model generated a function call. See below for a more production ready example that shows how to check if the model generated a function call
tool_call = response.choices[0].message.tool_calls[0]
arguments = json.loads(tool_call['function']['arguments'])

order_id = arguments.get('order_id')

# Call the get_delivery_date function with the extracted order_id

delivery_date = get_delivery_date(order_id)
```

```javascript
// Extract the arguments for get_delivery_date
// Note this code assumes we have already determined that the model generated a function call. See below for a more production ready example that shows how to check if the model generated a function call
const toolCall = response.choices[0].message.tool_calls[0];
const arguments = JSON.parse(toolCall.function.arguments);

const order_id = arguments.order_id;

// Call the get_delivery_date function with the extracted order_id
const delivery_date = get_delivery_date(order_id);
```

### Submitting function output

Once the function has been executed in the code, you need to submit the result of the function call back to the model.

This will trigger another model response, taking into account the function call result.

For example, this is how you can commit the result of the function call to a conversation history:

```python
# Simulate the order_id and delivery_date
order_id = "order_12345"
delivery_date = datetime.now()

# Simulate the tool call response

response = {
  "choices": [
      {
          "message": {
              "role": "assistant",
              "tool_calls": [
                  {
                      "id": "call_62136354",
                      "type": "function",
                      "function": {
                          "arguments": "{'order_id': 'order_12345'}",
                          "name": "get_delivery_date"
                      }
                  }
              ]
          }
      }
  ]
}

# Create a message containing the result of the function call

function_call_result_message = {
  "role": "tool",
  "content": json.dumps({
      "order_id": order_id,
      "delivery_date": delivery_date.strftime('%Y-%m-%d %H:%M:%S')
  }),
  "tool_call_id": response['choices'][0]['message']['tool_calls'][0]['id']
}

# Prepare the chat completion call payload

completion_payload = {
  "model": "gpt-4o",
  "messages": [
      {"role": "system", "content": "You are a helpful customer support assistant. Use the supplied tools to assist the user."},
      {"role": "user", "content": "Hi, can you tell me the delivery date for my order?"},
      {"role": "assistant", "content": "Hi there! I can help with that. Can you please provide your order ID?"},
      {"role": "user", "content": "i think it is order_12345"},
      response['choices'][0]['message'],
      function_call_result_message
  ]
}

# Call the OpenAI API's chat completions endpoint to send the tool call result back to the model

response = openai.chat.completions.create(
  model=completion_payload["model"],
  messages=completion_payload["messages"]
)

# Print the response from the API. In this case it will typically contain a message such as "The delivery date for your order #12345 is xyz. Is there anything else I can help you with?"

print(response)
```

```javascript
// Simulate the order_id and delivery_date
const order_id = "order_12345";
const delivery_date = moment();

// Simulate the tool call response
const response = {
  choices: [
      {
          message: {
              tool_calls: [
                  { id: "tool_call_1" }
              ]
          }
      }
  ]
};

// Create a message containing the result of the function call
const function_call_result_message = {
  role: "tool",
  content: JSON.stringify({
      order_id: order_id,
      delivery_date: delivery_date.format('YYYY-MM-DD HH:mm:ss')
  }),
  tool_call_id: response.choices[0].message.tool_calls[0].id
};

// Prepare the chat completion call payload
const completion_payload = {
  model: "gpt-4o",
  messages: [
      { role: "system", content: "You are a helpful customer support assistant. Use the supplied tools to assist the user." },
      { role: "user", content: "Hi, can you tell me the delivery date for my order?" },
      { role: "assistant", content: "Hi there! I can help with that. Can you please provide your order ID?" },
      { role: "user", content: "i think it is order_12345" },
      response.choices[0].message,
      function_call_result_message
  ]
};

// Call the OpenAI API's chat completions endpoint to send the tool call result back to the model
const final_response = await openai.chat.completions.create({
  model: completion_payload.model,
  messages: completion_payload.messages
});

// Print the response from the API. In this case it will typically contain a message such as "The delivery date for your order #12345 is xyz. Is there anything else I can help you with?"
console.log(final_response);
```

Note that an assistant message containing tool calls should always be followed by tool response messages (one per tool call). Making an API call with a messages array that does not follow this pattern will result in an error.

Structured Outputs
------------------

In August 2024, we launched Structured Outputs, which ensures that a model's output exactly matches a specified JSON schema.

By default, when using function calling, the API will offer best-effort matching for your parameters, which means that occasionally the model may miss parameters or get their types wrong when using complicated schemas.

You can enable Structured Outputs for function calling by setting the parameter `strict: true` in your function definition. You should also include the parameter `additionalProperties: false` and mark all arguments as required in your request. When this is enabled, the function arguments generated by the model will be constrained to match the JSON Schema provided in the function definition.

As an alternative to function calling you can instead constrain the model's regular output to match a JSON Schema of your choosing. [Learn more](/docs/guides/structured-outputs#function-calling-vs-response-format) about when to use function calling vs when to control the model's normal output by using `response_format`.

### Parallel function calling and Structured Outputs

When the model outputs multiple function calls via parallel function calling, model outputs may not match strict schemas supplied in tools.

In order to ensure strict schema adherence, disable parallel function calls by supplying `parallel_tool_calls: false`. With this setting, the model will generate one function call at a time.

### Why might I not want to turn on Structured Outputs?

The main reasons to not use Structured Outputs are:

*   If you need to use some feature of JSON Schema that is not yet supported ([learn more](/docs/guides/structured-outputs#supported-schemas)), for example recursive schemas.
*   If each of your API requests includes a novel schema (i.e. your schemas are not fixed, but are generated on-demand and rarely repeat). The first request with a novel JSON schema will have increased latency as the schema is pre-processed and cached for future generations to constrain the output of the model.

### What does Structured Outputs mean for Zero Data Retention?

When Structured Outputs is turned on, schemas provided are not eligible for [zero data retention](/docs/models#how-we-use-your-data).

### Supported schemas

Function calling with Structured Outputs supports a subset of the JSON Schema language.

For more information on supported schemas, see the [Structured Outputs guide](/docs/guides/structured-outputs#supported-schemas).

### Example

You can use zod in nodeJS and Pydantic in python when using the SDKs to pass your function definitions to the model.

```javascript
import OpenAI from "openai";
import { z } from "zod";
import { zodFunction } from "openai/helpers/zod";

const OrderParameters = z.object({
  order_id: z.string().describe("The customer's order ID."),
});

const tools = [
  zodFunction({ name: "getDeliveryDate", parameters: OrderParameters }),
];

const messages = [
  {
    role: "system",
    content: "You are a helpful customer support assistant. Use the supplied tools to assist the user.",
  },
  {
    role: "user",
    content: "Hi, can you tell me the delivery date for my order #12345?",
  },
];

const openai = new OpenAI();

const response = await openai.beta.chat.completions.create({
  model: "gpt-4o-2024-08-06",
  messages,
  tools,
});

console.log(response.choices[0].message.tool_calls?.[0].function);
```

```python
from enum import Enum
from typing import Union
from pydantic import BaseModel
import openai
from openai import OpenAI

client = OpenAI()

class GetDeliveryDate(BaseModel):
    order_id: str

tools = [openai.pydantic_function_tool(GetDeliveryDate)]

messages = []
messages.append({"role": "system", "content": "You are a helpful customer support assistant. Use the supplied tools to assist the user."})
messages.append({"role": "user", "content": "Hi, can you tell me the delivery date for my order #12345?"})

response = client.beta.chat.completions.create(
    model='gpt-4o-2024-08-06',
    messages=messages,
    tools=tools
)

print(response.choices[0].message.tool_calls[0].function)
```

```bash
curl https://api.openai.com/v1/chat/completions \
    -H "Authorization: Bearer $OPENAI_API_KEY" \
    -H "Content-Type: application/json" \
    -d '{
        "model": "gpt-4o-2024-08-06",
        "messages": [
            {
                "role": "system",
                "content": "You are a helpful customer support assistant. Use the supplied tools to assist the user."
            },
            {
                "role": "user",
                "content": "Hi, can you tell me the delivery date for my order #12345?"
            }
        ],
        "tools": [
            {
                "type": "function",
                "function": {
                    "name": "get_delivery_date",
                    "description": "Get the delivery date for a customer’s order. Call this whenever you need to know the delivery date, for example when a customer asks \"Where is my package\"",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "order_id": {
                                "type": "string",
                                "description": "The customer’s order ID."
                            }
                        },
                        "required": ["order_id"],
                        "additionalProperties": false
                    }
                },
                "strict": true
            }
        ]
    }'
```

If you are not using the SDKs, add the `strict: true` parameter to your function definition. Additionally, all parameters must be included in the `required` array, and `additionalProperties: false` must be set.

```json
{
    "name": "get_delivery_date",
    "description": "Get the delivery date for a customer's order. Call this whenever you need to know the delivery date, for example when a customer asks \\"Where is my package\\"",
    "strict": true,
    "parameters": {
        "type": "object",
        "properties": {
            "order_id": { "type": "string" }
        },
        "required": ["order_id"],
        "additionalProperties": false,
    }
}
```

### Limitations

When you use Structured Outputs with function calling, the model will always follow your exact schema, except in a few circumstances:

*   When the model's response is cut off (either due to `max_tokens`, `stop_tokens`, or maximum context length)
*   When a model [refusal](/docs/guides/structured-outputs#refusals) happens
*   When there is a `content_filter` finish reason

Note that the first time you send a request with a new schema using Structured Outputs, there will be additional latency as the schema is processed, but subsequent requests should incur no overhead.

Advanced usage
--------------

### Streaming tool calls

You can stream tool calls and process function arguments as they are being generated. This is especially useful if you want to display the function arguments in your UI, or if you don't need to wait for the whole function parameters to be generated before executing the function.

To enable streaming tool calls, you can set `stream: true` in your request. You can then process the streaming delta and check for any new tool calls delta.

You can find more information on streaming in the [API reference](/docs/api-reference/streaming).

Here is an example of how you can handle streaming tool calls with the node and python SDKs:

```python
from openai import OpenAI
import json

client = OpenAI()

# Define functions
tools = [
  {
      "type": "function",
      "function": {
          "name": "generate_recipe",
          "description": "Generate a recipe based on the user's input",
          "parameters": {
              "type": "object",
              "properties": {
                  "title": {
                      "type": "string",
                      "description": "Title of the recipe.",
                  },
                  "ingredients": {
                      "type": "array",
                      "items": {"type": "string"},
                      "description": "List of ingredients required for the recipe.",
                  },
                  "instructions": {
                      "type": "array",
                      "items": {"type": "string"},
                      "description": "Step-by-step instructions for the recipe.",
                  },
              },
              "required": ["title", "ingredients", "instructions"],
              "additionalProperties": False,
          },
      },
  }
]

response_stream = client.chat.completions.create(
  model="gpt-4o",
  messages=[
      {
          "role": "system",
          "content": (
              "You are an expert cook who can help turn any user input into a delicious recipe."
              "As soon as the user tells you what they want, use the generate_recipe tool to create a detailed recipe for them."
          ),
      },
      {
          "role": "user",
          "content": "I want to make pancakes for 4.",
      },
  ],
  tools=tools,
  stream=True,
)

function_arguments = ""
function_name = ""
is_collecting_function_args = False

for part in response_stream:
  delta = part.choices[0].delta
  finish_reason = part.choices[0].finish_reason

  # Process assistant content
  if 'content' in delta:
      print("Assistant:", delta.content)

  if delta.tool_calls:
      is_collecting_function_args = True
      tool_call = delta.tool_calls[0]

      if tool_call.function.name:
          function_name = tool_call.function.name
          print(f"Function name: '{function_name}'")
      
      # Process function arguments delta
      if tool_call.function.arguments:
          function_arguments += tool_call.function.arguments
          print(f"Arguments: {function_arguments}")

  # Process tool call with complete arguments
  if finish_reason == "tool_calls" and is_collecting_function_args:
      print(f"Function call '{function_name}' is complete.")
      args = json.loads(function_arguments)
      print("Complete function arguments:")
      print(json.dumps(args, indent=2))
   
      # Reset for the next potential function call
      function_arguments = ""
      function_name = ""
      is_collecting_function_args = False
```

```javascript
import OpenAI from "openai";

const openai = new OpenAI();

// Define functions
const tools = [
{
  type: "function",
  function: {
    name: "generate_recipe",
    description: "Generate a recipe based on the user's input",
    parameters: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description: "Title of the recipe.",
        },
        ingredients: {
          type: "array",
          items: { type: "string" },
          description: "List of ingredients required for the recipe.",
        },
        instructions: {
          type: "array",
          items: { type: "string" },
          description: "Step-by-step instructions for the recipe.",
        },
      },
      required: ["title", "ingredients", "instructions"],
      additionalProperties: false,
    },
  },
},
];

const responseStream = await openai.chat.completions.create({
model: "gpt-4o",
messages: [
  {
    role: "system",
    content:
      "You are an expert cook who can help turn any user input into a delicious recipe. As soon as the user tells you what they want, use the generate_recipe tool to create a detailed recipe for them.",
  },
  {
    role: "user",
    content: "I want to make pancakes for 4.",
  },
],
tools: tools,
stream: true,
});

let functionArguments = "";
let functionName = "";
let isCollectingFunctionArgs = false;

for await (const part of responseStream) {
const delta = part.choices[0].delta;
const finishReason = part.choices[0].finish_reason;

if (delta.content) {
  // Process assistant content
  console.log("Assistant:", delta.content);
}

if (delta.tool_calls) {
  isCollectingFunctionArgs = true;
  const toolCall = delta.tool_calls[0];

  if (toolCall.function?.name) {
    functionName = toolCall.function.name;
    console.log("Function name:", functionName);
  }

  if (toolCall.function?.arguments) {
    functionArguments += toolCall.function.arguments;
    // Process function arguments delta
    console.log(`Arguments: ${functionArguments}`);
  }
}

// Process tool call with complete arguments
if (finishReason === "tool_calls" && isCollectingFunctionArgs) {
  console.log(`Function call '${functionName}' is complete.`);

  const args = JSON.parse(functionArguments);
  console.log("Complete function arguments:", args);

  // Reset for the next potential function call
  functionArguments = "";
  functionName = "";
  isCollectingFunctionArgs = false;
}
}
```

### Tool calling behavior

The API supports advanced features such as parallel tool calling and the ability to force tool calls.

You can disable parallel tool calling by setting `parallel_tool_calls: false`.

Parallel tool calling

Any models released on or after Nov 6, 2023 may by default generate multiple tool calls in a single response, indicating that they should be called in parallel.

This is especially useful if executing the given functions takes a long time. For example, the model may call functions to get the weather in 3 different locations at the same time, which will result in a message with 3 function calls in the tool\_calls array.

Example response:

```python
response = Choice(
  finish_reason='tool_calls', 
  index=0, 
  logprobs=None, 
  message=chat.completionsMessage(
      content=None, 
      role='assistant', 
      function_call=None, 
      tool_calls=[
          chat.completionsMessageToolCall(
              id='call_62136355', 
              function=Function(
                  arguments='{"city":"New York"}', 
                  name='check_weather'), 
              type='function'),
          chat.completionsMessageToolCall(
              id='call_62136356', 
              function=Function(
                  arguments='{"city":"London"}', 
                  name='check_weather'), 
              type='function'),
          chat.completionsMessageToolCall(
              id='call_62136357', 
              function=Function(
                  arguments='{"city":"Tokyo"}', 
                  name='check_weather'), 
              type='function')
      ])
)

# Iterate through tool calls to handle each weather check

for tool_call in response.message.tool_calls:
  arguments = json.loads(tool_call.function.arguments)
  city = arguments['city']
  weather_info = check_weather(city)
  print(f"Weather in {city}: {weather_info}")
```

```javascript
const response = {
  finish_reason: 'tool_calls',
  index: 0,
  logprobs: null,
  message: {
      content: null,
      role: 'assistant',
      function_call: null,
      tool_calls: [
          {
              id: 'call_62136355',
              function: {
                  arguments: '{"city":"New York"}',
                  name: 'check_weather'
              },
              type: 'function'
          },
          {
              id: 'call_62136356',
              function: {
                  arguments: '{"city":"London"}',
                  name: 'check_weather'
              },
              type: 'function'
          },
          {
              id: 'call_62136357',
              function: {
                  arguments: '{"city":"Tokyo"}',
                  name: 'check_weather'
              },
              type: 'function'
          }
      ]
  }
};

// Iterate through tool calls to handle each weather check
response.message.tool_calls.forEach(tool_call => {
  const arguments = JSON.parse(tool_call.function.arguments);
  const city = arguments.city;
  check_weather(city).then(weather_info => {
      console.log(`Weather in ${city}: ${weather_info}`);
  });
});
```

Each function call in the array has a unique `id`.

Once you've executed these function calls in your application, you can provide the result back to the model by adding one new message to the conversation for each function call, each containing the result of one function call, with a `tool_call_id` referencing the `id` from `tool_calls`, for example:

```python
# Assume we have fetched the weather data from somewhere
weather_data = {
  "New York": {"temperature": "22°C", "condition": "Sunny"},
  "London": {"temperature": "15°C", "condition": "Cloudy"},
  "Tokyo": {"temperature": "25°C", "condition": "Rainy"}
}
  
# Prepare the chat completion call payload with inline function call result creation
completion_payload = {
  "model": "gpt-4o",
  "messages": [
      {"role": "system", "content": "You are a helpful assistant providing weather updates."},
      {"role": "user", "content": "Can you tell me the weather in New York, London, and Tokyo?"},
      # Append the original function calls to the conversation
      response['message'],
      # Include the result of the function calls
      {
          "role": "tool",
          "content": json.dumps({
              "city": "New York",
              "weather": weather_data["New York"]
          }),
          # Here we specify the tool_call_id that this result corresponds to
          "tool_call_id": response['message']['tool_calls'][0]['id']
      },
      {
          "role": "tool",
          "content": json.dumps({
              "city": "London",
              "weather": weather_data["London"]
          }),
          "tool_call_id": response['message']['tool_calls'][1]['id']
      },
      {
          "role": "tool",
          "content": json.dumps({
              "city": "Tokyo",
              "weather": weather_data["Tokyo"]
          }),
          "tool_call_id": response['message']['tool_calls'][2]['id']
      }
  ]
}
  
# Call the OpenAI API's chat completions endpoint to send the tool call result back to the model
response = openai.chat.completions.create(
  model=completion_payload["model"],
  messages=completion_payload["messages"]
)
  
# Print the response from the API, which will return something like "In New York the weather is..."
print(response)
```

```javascript
// Assume we have fetched the weather data from somewhere
const weather_data = {
  "New York": { "temperature": "22°C", "condition": "Sunny" },
  "London": { "temperature": "15°C", "condition": "Cloudy" },
  "Tokyo": { "temperature": "25°C", "condition": "Rainy" }
};

// Prepare the chat completion call payload with inline function call result creation
const completion_payload = {
  model: "gpt-4o",
  messages: [
      { role: "system", content: "You are a helpful assistant providing weather updates." },
      { role: "user", content: "Can you tell me the weather in New York, London, and Tokyo?" },
      // Append the original function calls to the conversation
      response.message,
      // Include the result of the function calls
      {
          role: "tool",
          content: JSON.stringify({
              city: "New York",
              weather: weather_data["New York"]
          }),
          // Here we specify the tool_call_id that this result corresponds to
          tool_call_id: response.message.tool_calls[0].id
      },
      {
          role: "tool",
          content: JSON.stringify({
              city: "London",
              weather: weather_data["London"]
          }),
          tool_call_id: response.message.tool_calls[1].id
      },
      {
          role: "tool",
          content: JSON.stringify({
              city: "Tokyo",
              weather: weather_data["Tokyo"]
          }),
          tool_call_id: response.message.tool_calls[2].id
      }
  ]
};

// Call the OpenAI API's chat completions endpoint to send the tool call result back to the model
const response = await openai.chat.completions.create({
  model: completion_payload.model,
  messages: completion_payload.messages
});

// Print the response from the API, which will return something like "In New York the weather is..."
console.log(response);
```

Forcing tool calls

By default, the model is configured to automatically select which tools to call, as determined by the `tool_choice: "auto"` setting.

We offer three ways to customize the default behavior:

1.  To force the model to always call one or more tools, you can set `tool_choice: "required"`. The model will then always select one or more tool(s) to call. This is useful for example if you want the model to pick between multiple actions to perform next
2.  To force the model to call a specific function, you can set `tool_choice: {"type": "function", "function": {"name": "my_function"}}`
3.  To disable function calling and force the model to only generate a user-facing message, you can either provide no tools, or set `tool_choice: "none"`

Note that if you do either 1 or 2 (i.e. force the model to call a function) then the subsequent `finish_reason` will be `"stop"` instead of being `"tool_calls"`.

```python
from openai import OpenAI

client = OpenAI()

tools = [
  {
      "type": "function",
      "function": {
          "name": "get_weather",
          "strict": True,
          "parameters": {
              "type": "object",
              "properties": {
                  "location": {"type": "string"},
                  "unit": {"type": "string", "enum": ["c", "f"]},
              },
              "required": ["location", "unit"],
              "additionalProperties": False,
          },
      },
  },
  {
      "type": "function",
      "function": {
          "name": "get_stock_price",
          "strict": True,
          "parameters": {
              "type": "object",
              "properties": {
                  "symbol": {"type": "string"},
              },
              "required": ["symbol"],
              "additionalProperties": False,
          },
      },
  },
]

messages = [{"role": "user", "content": "What's the weather like in Boston today?"}]
completion = client.chat.completions.create(
  model="gpt-4o",
  messages=messages,
  tools=tools,
  tool_choice="required"
)

print(completion)
```

```javascript
import { OpenAI } from "openai";
const openai = new OpenAI();

// Define a set of tools to use
const tools = [
  {
      type: "function",
      function: {
          name: "get_weather",
          strict: true,
          parameters: {
              type: "object",
              properties: {
                  location: { type: "string" },
                  unit: { type: "string", enum: ["c", "f"] },
              },
              required: ["location", "unit"],
              additionalProperties: false,
          },
      },
  },
  {
      type: "function",
      function: {
          name: "get_stock_price",
          strict: true,
          parameters: {
              type: "object",
              properties: {
                  symbol: { type: "string" },
              },
              required: ["symbol"],
              additionalProperties: false,
          },
      },
  },
];

// Call the OpenAI API's chat completions endpoint
const response = await openai.chat.completions.create({
  model: "gpt-4o",
  messages: [
      {
          role: "user",
          content: "Can you tell me the weather in Tokyo?",
      },
  ],
  tool_choice: "required",
  tools,
});

// Print the response from the API
console.log(response);
```

To see a practical example of how to force tool calls, see our cookbook:

[

Customer service with tool required

Learn how to add an element of determinism to your customer service assistant

](https://cookbook.openai.com/examples/using_tool_required_for_customer_service)

### Edge cases

We recommend using the SDK to handle the edge cases described below. If for any reason you cannot use the SDK, you should handle these cases in your code.

When you receive a response from the API, if you're not using the SDK, there are a number of edge cases that production code should handle.

In general, the API will return a valid function call, but there are some edge cases when this won't happen:

*   When you have specified `max_tokens` and the model's response is cut off as a result
*   When the model's output includes copyrighted material

Also, when you force the model to call a function, the `finish_reason` will be `"stop"` instead of `"tool_calls"`.

This is how you can handle these different cases in your code:

```python
# Check if the conversation was too long for the context window
if response['choices'][0]['message']['finish_reason'] == "length":
  print("Error: The conversation was too long for the context window.")
  # Handle the error as needed, e.g., by truncating the conversation or asking for clarification
  handle_length_error(response)
  
# Check if the model's output included copyright material (or similar)
if response['choices'][0]['message']['finish_reason'] == "content_filter":
  print("Error: The content was filtered due to policy violations.")
  # Handle the error as needed, e.g., by modifying the request or notifying the user
  handle_content_filter_error(response)
  
# Check if the model has made a tool_call. This is the case either if the "finish_reason" is "tool_calls" or if the "finish_reason" is "stop" and our API request had forced a function call
if (response['choices'][0]['message']['finish_reason'] == "tool_calls" or 
  # This handles the edge case where if we forced the model to call one of our functions, the finish_reason will actually be "stop" instead of "tool_calls"
  (our_api_request_forced_a_tool_call and response['choices'][0]['message']['finish_reason'] == "stop")):
  # Handle tool call
  print("Model made a tool call.")
  # Your code to handle tool calls
  handle_tool_call(response)
  
# Else finish_reason is "stop", in which case the model was just responding directly to the user
elif response['choices'][0]['message']['finish_reason'] == "stop":
  # Handle the normal stop case
  print("Model responded directly to the user.")
  # Your code to handle normal responses
  handle_normal_response(response)
  
# Catch any other case, this is unexpected
else:
  print("Unexpected finish_reason:", response['choices'][0]['message']['finish_reason'])
  # Handle unexpected cases as needed
  handle_unexpected_case(response)
```

```javascript
// Check if the conversation was too long for the context window
if (response.choices[0].message.finish_reason === "length") {
  console.log("Error: The conversation was too long for the context window.");
  // Handle the error as needed, e.g., by truncating the conversation or asking for clarification
  handleLengthError(response);
}

// Check if the model's output included copyright material (or similar)
if (response.choices[0].message.finish_reason === "content_filter") {
  console.log("Error: The content was filtered due to policy violations.");
  // Handle the error as needed, e.g., by modifying the request or notifying the user
  handleContentFilterError(response);
}

// Check if the model has made a tool_call. This is the case either if the "finish_reason" is "tool_calls" or if the "finish_reason" is "stop" and our API request had forced a function call
if (
  response.choices[0].message.finish_reason === "tool_calls" ||
  (ourApiRequestForcedAToolCall && response.choices[0].message.finish_reason === "stop")
) {
  // Handle tool call
  console.log("Model made a tool call.");
  // Your code to handle tool calls
  handleToolCall(response);
}

// Else finish_reason is "stop", in which case the model was just responding directly to the user
else if (response.choices[0].message.finish_reason === "stop") {
  // Handle the normal stop case
  console.log("Model responded directly to the user.");
  // Your code to handle normal responses
  handleNormalResponse(response);
}

// Catch any other case, this is unexpected
else {
  console.log("Unexpected finish_reason:", response.choices[0].message.finish_reason);
  // Handle unexpected cases as needed
  handleUnexpectedCase(response);
}
```

### Token usage

Under the hood, functions are injected into the system message in a syntax the model has been trained on. This means functions count against the model's context limit and are billed as input tokens. If you run into token limits, we suggest limiting the number of functions or the length of the descriptions you provide for function parameters.

It is also possible to use fine-tuning to reduce the number of tokens used if you have many functions defined in your tools specification.

Examples
--------

The [OpenAI Cookbook](https://cookbook.openai.com/) has several end-to-end examples to help you implement function calling.

In our introductory cookbook [how to call functions with chat models](https://cookbook.openai.com/examples/how_to_call_functions_with_chat_models), we outline two examples of how the models can use function calling. This is a great resource to follow as you get started:

[

Function calling

Learn from more examples demonstrating function calling

](https://cookbook.openai.com/examples/how_to_call_functions_with_chat_models)

You will also find examples of function definitions for common use cases below.

Shopping Assistant

#### Scenario

A shopping assistant helps users navigate an e-commerce site. It needs to fetch product data from a structured database, and suggest recommendations based on the user's query. Once the user has found a product they are interested in, the assistant can add it to the shopping cart on their behalf.

#### Function definitions

To recommend products to the user, the assistant needs to query the products database. To find more details about a product, such as reviews and additional information (e.g. materials, dimensions...), the assistant needs to fetch more information on the specific product. It also needs a tool to add items to the shopping cart.

We will then define the following functions:

*   `get_product_recommendations`: Recommends products based on filters
*   `get_product_details`: Fetches more details about a product
*   `add_to_cart`: Adds a product to the shopping cart

```json
[
    {
        "type": "function",
        "function": {
            "name": "get_product_recommendations",
            "description": "Searches for products matching certain criteria in the database",
            "parameters": {
                "type": "object",
                "properties": {
                    "categories": {
                        "description": "categories that could be a match",
                        "type": "array",
                        "items": {
                            "type": "string",
                            "enum": [
                                "coats & jackets",
                                "accessories",
                                "tops",
                                "jeans & trousers",
                                "skirts & dresses",
                                "shoes"
                            ]
                        }
                    },
                    "colors": {
                        "description": "colors that could be a match, empty array if N/A",
                        "type": "array",
                        "items": {
                            "type": "string",
                            "enum": [
                                "black",
                                "white",
                                "brown",
                                "red",
                                "blue",
                                "green",
                                "orange",
                                "yellow",
                                "pink",
                                "gold",
                                "silver"
                            ]
                        }
                    },
                    "keywords": {
                        "description": "keywords that should be present in the item title or description",
                        "type": "array",
                        "items": {
                            "type": "string"
                        }
                    },
                    "price_range": {
                        "type": "object",
                        "properties": {
                            "min": {
                                "type": "number"
                            },
                            "max": {
                                "type": "number"
                            }
                        },
                        "required": [
                        "min",
                        "max"
                        ],
                        "additionalProperties": false
                    },
                    "limit": {
                        "type": "integer",
                        "description": "The maximum number of products to return, use 5 by default if nothing is specified by the user"
                    }
                },
                "required": [
                    "categories",
                    "colors",
                    "keywords",
                    "price_range",
                    "limit"
                ],
                "additionalProperties": false
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_product_details",
            "description": "Fetches more details about a product",
            "parameters": {
                "type": "object",
                "properties": {
                    "product_id": {
                        "type": "string",
                        "description": "The ID of the product to fetch details for"
                    }
                },
                "required": [
                    "product_id"
                ],
                "additionalProperties": false
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "add_to_cart",
            "description": "Add items to cart when the user has confirmed their interest.",
            "parameters": {
                "type": "object",
                "properties": {
                    "items": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "product_id": {
                                    "type": "string",
                                    "description": "ID of the product to add to the cart"
                                },
                                "quantity": {
                                    "type": "integer",
                                    "description": "Quantity of the product to add to the cart"
                                }
                            },
                            "required": [
                                "product_id",
                                "quantity"
                            ],
                            "additionalProperties": false
                        }
                    },
                    "required": [
                        "items"
                    ],
                    "additionalProperties": false
                }
            }
        }
    }
]
```

Customer Service Agent

#### Scenario

A customer service assistant on an e-commerce site helps users after they have made a purchase. It can answer questions about their orders or the company policy regarding returns and refunds. It can also help customers process a return and give status updates.

#### Function definitions

To answer questions about orders, the assistant needs to fetch order details from the orders database. In case the user doesn't know their order number, the assistant should also be able to fetch the last orders for a given user. It should also be able to search the FAQ to respond to general questions. Lastly, it should be equipped with tools to process returns and find a return status.

We will then define the following functions:

*   `get_order_details`: Fetches details about a specific order
*   `get_user_orders`: Fetches the last orders for a given user
*   `search_faq`: Searches the FAQ for an answer to the user's question
*   `process_return`: Processes a return and creates a return label
*   `get_return_status`: Finds the status of a return

```json
[
    {
        "type": "function",
        "function": {
            "name": "get_order_details",
            "description": "Fetches details about a specific order",
            "parameters": {
                "type": "object",
                "properties": {
                    "order_id": {
                        "type": "string",
                        "description": "The ID of the order to fetch details for"
                    }
                },
                "required": [
                    "order_id"
                ],
                "additionalProperties": false
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_user_orders",
            "description": "Fetches the last orders for a given user",
            "parameters": {
                "type": "object",
                "properties": {
                    "user_id": {
                        "type": "string",
                        "description": "The ID of the user to fetch orders for"
                    },
                    "limit": {
                        "type": "integer",
                        "description": "The maximum number of orders to return, use 5 by default and increase the number if the relevant order is not found."
                    }
                },
                "required": [
                    "user_id", "limit"
                ],
                "additionalProperties": false
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "search_faq",
            "description": "Searches the FAQ for an answer to the user's question",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "The question to search the FAQ for"
                    }
                },
                "required": [
                    "query"
                ],
                "additionalProperties": false
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "process_return",
            "description": "Processes a return and creates a return label",
            "parameters": {
                "type": "object",
                "properties": {
                    "order_id": {
                        "type": "string",
                        "description": "The ID of the order to process a return for"
                    },
                    "items": {
                        "type": "array",
                        "description": "The items to return",
                        "items": {
                            "type": "object",
                            "properties": {
                                "product_id": {
                                    "type": "string",
                                    "description": "The ID of the product to return"
                                },
                                "quantity": {
                                    "type": "integer",
                                    "description": "The quantity of the product to return"
                                }
                            },
                            "required": [
                                "product_id",
                                "quantity"
                            ],
                            "additionalProperties": false
                        }
                    }
                },
                "required": [
                    "order_id",
                    "items"
                ],
                "additionalProperties": false
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_return_status",
            "description": "Finds the status of a return",
            "parameters": {
                "type": "object",
                "properties": {
                    "order_id": {
                        "type": "string",
                        "description": "The ID of the order to fetch the return status for"
                    }
                },
                "required": [
                    "order_id"
                ],
                "additionalProperties": false
            }
        }
    }
]
```

Interactive Booking Experience

#### Scenario

A user is on an interactive website to find a place to eat or stay. After they mention their preferences, the website updates to show recommendations on a map. Once they have found a place they are interested in, a booking is programmatically made on their behalf.

#### Function definitions

To be able to show recommendations, the app needs to first fetch recommendations based on the user's preferences, and then pin those recommendations on the map. To book a place, the assistant needs to fetch the availability of the place, and then create a booking on the user's behalf.

We will then define the following functions:

*   `get_recommendations`: Fetche recommendations based on the user's preferences
*   `show_on_map`: Place pins on the map
*   `fetch_availability`: Fetch the availability for a given place
*   `create_booking`: Create a booking on the user's behalf

```json
[
    {
        "type": "function",
        "function": {
            "name": "get_recommendations",
            "description": "Fetches recommendations based on the user's preferences",
            "parameters": {
                "type": "object",
                "properties": {
                    "type": {
                        "type": "string",
                        "description": "The type of place to search recommendations for",
                        "enum": ["restaurant", "hotel"]
                    },
                    "keywords": {
                        "type": "array",
                        "description": "Keywords that should be present in the recommendations",
                        "items": {
                            "type": "string"
                        }
                    },
                    "location": {
                        "type": "string",
                        "description": "The location to search recommendations for"
                    }
                },
                "required": [
                    "type",
                    "keywords",
                    "location"
                ],
                "additionalProperties": false
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "show_on_map",
            "description": "Places pins on the map for relevant locations",
            "parameters": {
                "type": "object",
                "properties": {
                    "pins": {
                        "type": "array",
                        "description": "The pins to place on the map",
                        "items": {
                            "type": "object",
                            "properties": {
                                "name": {
                                    "type": "string",
                                    "description": "The name of the place"
                                },
                                "coordinates": {
                                    "type": "object",
                                    "properties": {
                                        "latitude": { "type": "number" },
                                        "longitude": { "type": "number" }
                                    },
                                    "required": [
                                        "latitude",
                                        "longitude"
                                    ],
                                    "additionalProperties": false
                                }
                            },
                            "required": [
                                "name",
                                "coordinates"
                            ],
                            "additionalProperties": false
                        }
                    }
                },
                "required": [
                    "pins"
                ],
                "additionalProperties": false
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "fetch_availability",
            "description": "Fetches the availability for a given place",
            "parameters": {
                "type": "object",
                "properties": {
                    "place_id": {
                        "type": "string",
                        "description": "The ID of the place to fetch availability for"
                    }
                }
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "create_booking",
            "description": "Creates a booking on the user's behalf",
            "parameters": {
                "type": "object",
                "properties": {
                    "place_id": {
                        "type": "string",
                        "description": "The ID of the place to create a booking for"
                    },
                    "booking_details": {
                        "anyOf": [
                            {
                                "type": "object",
                                "description": "Restaurant booking with specific date and time",
                                "properties": {
                                    "date": {
                                        "type": "string",
                                        "description": "The date of the booking, in format YYYY-MM-DD"
                                    },
                                    "time": {
                                        "type": "string",
                                        "description": "The time of the booking, in format HH:MM"
                                    }
                                },
                                "required": [
                                    "date",
                                    "time"
                                ]
                            },
                            {
                                "type": "object",
                                "description": "Hotel booking with specific check-in and check-out dates",
                                "properties": {
                                    "check_in": {
                                        "type": "string",
                                        "description": "The check-in date of the booking, in format YYYY-MM-DD"
                                    },
                                    "check_out": {
                                        "type": "string",
                                        "description": "The check-out date of the booking, in format YYYY-MM-DD"
                                    }
                                },
                                "required": [
                                    "check_in",
                                    "check_out"
                                ]
                            }
                        ]
                    }
                },
                "required": [
                    "place_id",
                    "booking_details"
                ],
                "additionalProperties": false
            }
        }
    }
]
```

Best practices
--------------

### Turn on Structured Outputs by setting `strict: "true"`

When Structured Outputs is turned on, the arguments generated by the model for function calls will reliably match the JSON Schema that you provide.

If you are not using Structured Outputs, then the structure of arguments is not guaranteed to be correct, so we recommend the use of a validation library like Pydantic to first verify the arguments prior to using them.

### Name functions intuitively, with detailed descriptions

If you find the model does not generate calls to the correct functions, you may need to update your function names and descriptions so the model more clearly understands when it should select each function. Avoid using abbreviations or acronyms to shorten function and argument names.

You can also include detailed descriptions for when a function should be called. For complex functions, you should include descriptions for each of the arguments to help the model know what it needs to ask the user to collect that argument.

### Name function parameters intuitively, with detailed descriptions

Use clear and descriptive names for function parameters. If applicable, specify the expected format for a parameter in the description (e.g., YYYY-mm-dd or dd/mm/yy for a date).

### Consider providing additional information about how and when to call functions in your system message

Providing clear instructions in your system message can significantly improve the model's function calling accuracy. For example, guide the model with instructions like the following:

`"Use check_order_status when the user inquires about the status of their order, such as 'Where is my order?' or 'Has my order shipped yet?'".`

Provide context for complex scenarios. For example:

`"Before scheduling a meeting with schedule_meeting, check the user's calendar for availability using check_availability to avoid conflicts."`

### Use enums for function arguments when possible

If your use case allows, you can use enums to constrain the possible values for arguments. This can help reduce hallucinations.

For example, if you have an AI assistant that helps with ordering a T-shirt, you likely have a fixed set of sizes for the T-shirt that you might want to constrain the model to choose from. If you want the model to output “s”, “m”, “l”, for small, medium, and large, you could provide those values in an enum, like this:

```json
{
    "name": "pick_tshirt_size",
    "description": "Call this if the user specifies which size t-shirt they want",
    "parameters": {
        "type": "object",
        "properties": {
            "size": {
                "type": "string",
                "enum": ["s", "m", "l"],
                "description": "The size of the t-shirt that the user would like to order"
            }
        },
        "required": ["size"],
        "additionalProperties": false
    }
}
```

If you don't constrain the output, a user may say “large” or “L”, and the model may use these values as a parameter. As your code may expect a specific structure, it's helpful to limit the possible values the model can choose from.

### Keep the number of functions low for higher accuracy

We recommend that you use no more than 20 tools in a single API call.

Developers typically see a reduction in the model's ability to select the correct tool once they have between 10-20 tools defined.

If your use case requires the model to be able to pick between a large number of custom functions, you may want to explore fine-tuning ([learn more](https://cookbook.openai.com/examples/fine_tuning_for_function_calling)) or break out the tools and group them logically to create a multi-agent system.

### Set up evals to act as an aid in prompt engineering your function definitions and system messages

We recommend for non-trivial uses of function calling setting up an evaluation system that allow you to measure how frequently the correct function is called or correct arguments are generated for a wide variety of possible user messages. Learn more about setting up evals on the [OpenAI Cookbook](https://cookbook.openai.com/examples/evaluation/getting_started_with_openai_evals).

You can then use these to measure whether adjustments to your function definitions and system messages will improve or hurt your integration.

### Fine-tuning may help improve accuracy for function calling

Fine-tuning a model can improve performance at function calling for your use case, especially if you have a large number of functions, or complex, nuanced or similar functions.

See our fine-tuning for function calling [cookbook](https://cookbook.openai.com/examples/fine_tuning_for_function_calling) for more information.

[

Fine-tuning for function calling

Learn how to fine-tune a model for function calling

](https://cookbook.openai.com/examples/fine_tuning_for_function_calling)