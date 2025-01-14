/**
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

export type Schema = Record<string, any>;

export interface ToolDefinition {
  name: string;
  description?: string;
  inputSchema: Schema;
  outputSchema?: Schema;
}

export type ToolArgument = string | ToolDefinition;

interface HasMetadata {
  /** Arbitrary metadata to be used by tooling or for informational purposes. */
  metadata?: Record<string, any>;
}

export interface PromptMetadata<ModelConfig = Record<string, any>> extends HasMetadata {
  /** The name of the prompt. */
  name?: string;
  /** The variant name for the prompt. */
  variant?: string;
  /** The name of the model to use for this prompt, e.g. `vertexai/gemini-1.0-pro` */
  model?: string;
  /** Names of tools (registered separately) to allow use of in this prompt. */
  tools?: string[];
  /** Definitions of tools to allow use of in this prompt. */
  toolDefs?: ToolDefinition[];
  /** Model configuration. Not all models support all options. */
  config?: ModelConfig;
  /** Configuration for input variables. */
  input?: {
    /** Defines the default input variable values to use if none are provided. */
    default?: Record<string, any>;
    /** Schema definition for input variables. */
    schema?: Schema;
  };

  /** Defines the expected model output format. */
  output?: {
    /** Desired output format for this prompt. */
    format?: string | "json" | "text";
    /** Schema defining the output structure. */
    schema?: Schema;
  };
}

interface EmptyPart extends HasMetadata {
  text?: never;
  data?: never;
  media?: never;
  toolRequest?: never;
  toolResponse?: never;
}

export type TextPart = Omit<EmptyPart, "text"> & { text: string };
export type DataPart = Omit<EmptyPart, "data"> & { data: Record<string, any> };
export type MediaPart = Omit<EmptyPart, "media"> & { media: { url: string; contentType?: string } };
export type ToolRequestPart<Input = any> = Omit<EmptyPart, "toolRequest"> & {
  toolRequest: { name: string; input?: Input; ref?: string };
};
export type ToolResponsePart<Output = any> = Omit<EmptyPart, "toolResponse"> & {
  toolResponse: { name: string; output?: Output; ref?: string };
};
export type PendingPart = EmptyPart & { metadata: { pending: true; [key: string]: any } };
export type Part =
  | TextPart
  | DataPart
  | MediaPart
  | ToolRequestPart
  | ToolResponsePart
  | PendingPart;

export interface Message extends HasMetadata {
  role: "user" | "model" | "tool" | "system";
  content: Part[];
}

export interface Document extends HasMetadata {
  content: Part[];
}

/**
 * DataArgument provides all of the information necessary to render a
 * template at runtime.
 **/
export interface DataArgument<Variables = any, State = any> {
  /** Input variables for the prompt template. */
  input?: Variables;
  /** Relevant documents. */
  docs?: Document[];
  /** Previous messages in the history of a multi-turn conversation. */
  messages?: Message[];
  /**
   * Items in the context argument are exposed as `@` variables, e.g.
   * `context: {state: {...}}` is exposed as `@state`.
   **/
  context?: Record<string, any>;
}

export type JSONSchema = any;

/**
 * SchemaResolver is a function that can resolve a provided schema name to
 * an underlying JSON schema, utilized for shorthand to a schema library
 * provided by an external tool.
 **/
export interface SchemaResolver {
  (schemaName: string): JSONSchema | null | Promise<JSONSchema | null>;
}

/**
 * SchemaResolver is a function that can resolve a provided tool name to
 * an underlying ToolDefinition, utilized for shorthand to a tool registry
 * provided by an external library.
 **/
export interface ToolResolver {
  (toolName: string): ToolDefinition | null | Promise<ToolDefinition | null>;
}

/**
 * A rendered prompt is the final result of rendering a Dotprompt template.
 * It includes all of the prompt metadata as well as a set of `messages` to
 * be sent to the  model.
 */
export interface RenderedPrompt<ModelConfig = Record<string, any>> extends PromptMetadata<ModelConfig> {
  /** The rendered messages of the prompt. */
  messages: Message[];
}

/**
 * CompiledPrompt is a function that takes runtime data / context and returns
 * a rendered prompt result.
 */
export interface CompiledPrompt<ModelConfig = Record<string,any>> {
  (data: DataArgument, options?: PromptMetadata<ModelConfig>): Promise<RenderedPrompt<ModelConfig>>;
}