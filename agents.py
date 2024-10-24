import requests
import os
from dotenv import load_dotenv
import json
import sys
import subprocess
from openai import OpenAI
from pydantic import BaseModel
from typing import Optional
from prompts.Child_Agent_prompt import system_msg
from execute_code import exec_code
import threading
import copy
import random


from terminal_ui.terminal_animation2 import (
    sub_search_dots,
    sub_thinking_dots,
    sub_picture_message,
    sub_search_message,
    sub_compiler_message,
    sub_user_message,
    sub_install_module,
    sub_uninstall_module,
)

load_dotenv()


class PerpSearch:
    def __init__(self):
        self.key = os.getenv("PERPLEXITY_API")
        self.url = "https://api.perplexity.ai/chat/completions"
        self.msg = [
            {
                "role": "system",
                "content": "Be very precise as the tokens you produce will affect another LLM's response. The information should be up to date, you will be mostly used for searches. Provide valid responses to the LLM. Do not provide extraneous, unsolicited content.The content must be Verbose and Valid. If the agent asks for a link, provide th actual link of the whatever's been asked without any wrapper on top",
            },
        ]
        self.payload = {
            "model": "llama-3.1-sonar-large-128k-online",
            "messages": self.msg,
            "temperature": 0.2,
            "top_p": 0.9,
            "return_citations": True,
            "search_domain_filter": ["perplexity.ai"],
            "return_images": True,
            "return_related_questions": True,
            "search_recency_filter": "month",
            "top_k": 0,
            "stream": False,
            "presence_penalty": 0,
            "frequency_penalty": 1,
        }
        self.headers = {
            "Authorization": f"Bearer {self.key}",
            "Content-Type": "application/json",
        }

    def search(self, query):
        self.msg.append({"role": "user", "content": query})
        response = requests.request(
            "POST", self.url, json=self.payload, headers=self.headers
        )
        response = json.loads(response.text)
        response = response["choices"][0]["message"]["content"]
        self.msg.append({"role": "assistant", "content": response})
        return response

class GenerateImage:
    def __init__(self):
        self.key = os.getenv("OPENAPI_KEY")
        self.client = OpenAI(api_key=self.key)

    def generate(self, query):
        response = self.client.images.generate(
            model="dall-e-3",
            style="natural",
            prompt=query,
            size="1024x1024",
            quality="standard",
            n=1,
        )
        image_url = response.data[0].url
        return image_url

from miscellaneous import shorten_urls
class PicSearch:
    def __init__(self):
        self.store = []
        self.url = "https://pixabay.com/api/"
        self.params = {
            "key": os.getenv("PIXABAY_API"),
            "q": "",
            "image_type": "photo",
            "pretty": "true",
        }

    def picSearch(self, query):
        query = query.split(" ")
        query = "+".join(query)
        self.params["q"] = query
        response = requests.get(self.url, params=self.params)
        results = response.json()
        results = results["hits"]
        try:
            size = len(results)
            count = 5
            while count >= size:
                count = count - 1
            r = random.randint(0, size - count)
            for links in range(r, r + count):
                self.store.append(results[links]["webformatURL"])
            
            self.store = shorten_urls(self.store)
            return self.store
        except:
            return "no pictures found! make the search query simpler"

        finally:
            self.store = []
class PicDownloader:
    class Format(BaseModel):
        type: str
        code: str

    def __init__(self, query):
        self.key = os.getenv("OPENAPI_KEY")
        self.query = query
        self.client = OpenAI(api_key=self.key)

    def act(self,code):
        exec(code)

    def initiate(self):
        messages = [{"role": "system", "content": "Your job is to indentify if the code being given to you is downloading a picture or not and it is downlaoding picture, modify the code such that picture or pictures is/are downloaded to the folder 'render' with names same as the ones specified in the code being supplied to you"}, {"role": "system","content": '''the output format is in this manner
        {"type": "True or False", "code": "entire modified code of python"}. type should only be true if the code given is downloading pictures'''}
        ]
        messages.append({"role": "user", "content": self.query})
        completion = self.client.beta.chat.completions.parse(
            model="gpt-4o-mini-2024-07-18", messages=messages, response_format=self.Format
        )
        content = completion.choices[0].message.content
        messages.append({"role": "assistant", "content": content})
        msg = json.loads(content)
        type = msg["type"]
        code = msg["code"]
        if type:
            self.act(code)

class InstallModule:
    def __init__(self):
        pass

    def install(self, module):
        try:
            result = subprocess.run(
                [sys.executable, "-m", "pip", "install", module],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                check=True,
            )
            return {
                "output": f"{module} module installed successfully",
                "error": False,
            }
        except subprocess.CalledProcessError as e:
            return {
                "output": f"Error occurred while installing {module}:\n{e.stderr}",
                "error": True,
            }

    def uninstall(self, module):
        try:
            result = subprocess.run(
                [sys.executable, "-m", "pip", "uninstall", module, "-y"],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                check=True,
            )
            return {
                "output": f"{module} module uninstalled successfully",
                "error": False,
            }
        except subprocess.CalledProcessError as e:
            return {
                "output": f"Error occurred while uninstalling {module}:\n{e.stderr}",
                "error": True,
            }


search = PerpSearch()
picture = PicSearch()
install = InstallModule()
original_system_message = copy.deepcopy(system_msg)


class file_judger:
    class Format(BaseModel):
        file_type: str
        code: str

    def __init__(self, query):
        self.key = os.getenv("OPENAPI_KEY")
        self.query = query
        self.client = OpenAI(api_key=self.key)

    def initiate(self):
        messages = [
            {
                "role": "system",
                "content": "You will be given code, which you have to deem as either html, css or js or none. The code may include contents of python, but that is none of our concern. Your goal is to identify the traces either html,css or js and you have to extact the html,css or js code. The code will surely include python code as well, but you aim is to extract the html,css and js part. always ensure to change the name of js and css files cited in html file to 'scripts.js' and 'styles.css. If you encounter a case where all html,css,js are in the same code, extract all of it into html file and name it index.html. Always regardless of whether the original file contains script and styles tags, you still have to add them, pointing towards styles.css and scripts.js.Remember it should always be scripts.js and styles.css"
            },
            {
                "role": "system",
                "content": """This is how you provide your output {'file_type': 'provide the file type (html,css,js, none)', 'code': 'extracted html,css or js code only. None if no traces of html,css or js'}""",
            },
        ]
        messages.append({"role": "user", "content": self.query})
        completion = self.client.beta.chat.completions.parse(
            model="gpt-4o-mini-2024-07-18", messages=messages, response_format=self.Format
        )
        content = completion.choices[0].message.content
        messages.append({"role": "assistant", "content": content})
        self.act(content)

    def act(self, content):
        json_content = json.loads(content)
        type = json_content["file_type"]
        code = json_content["code"]
        if type != "none":

            if type == "html":
                with open("render/index.html", "w") as file:
                    file.write(code)
            elif type == "css":
                with open("render/styles.css", "w") as file:
                    file.write(code)
            elif type == "js":
                with open("render/scripts.js", "w") as file:
                    file.write(code)
            elif type == "python":
                exec(code)

class Code_Fixer:
    class Format(BaseModel):
        error_description: str
        code: str

    def __init__(self, query):
        self.key = os.getenv("OPENAPI_KEY")
        self.query = query
        self.client = OpenAI(api_key=self.key)

    def initiate(self):

        messages = [
            {
                "role": "system",
                "content": "You are specialist in providing remedy to the incorrect code and error provided to you. The code is being ran in a python environment.",
            },
            {
                "role": "system",
                "content": "when writing a multi-line html, css, js, python code using this ('''), ensure that you dont include '\n' in it as the code will run into an error",
            },
            {
                "role": "system",
                "content": " Always implement the code directly without any string formatting issues.",
            },
            {
                "role": "system",
                "content": """This is how you provide your output {'error_description': 'There is wehere you write about the error', 'code': 'complete corrected python code for execution'}""",
            },
        ]
        messages.append({"role": "user", "content": self.query})
        completion = self.client.beta.chat.completions.parse(
            model="gpt-4o-mini-2024-07-18", messages=messages, response_format=self.Format
        )
        content = completion.choices[0].message.content
        messages.append({"role": "assistant", "content": content})
        return content


class Sub_Agent:
    class Tool(BaseModel):
        tool_name: str
        required: bool
        thinking_phase: str
        important_parameter: str
        print_statement_to_add: str
        code: Optional[str] = None
        query: Optional[str] = None

    class Message(BaseModel):
        message_from_SeniorAgent: str
        tasks_to_achieve: str
        immediate_task_to_achieve: str
        message_to_Senior_agent: str
        tool: "Sub_Agent.Tool"
        call_myself: str

    def __init__(self):
        self.key = os.getenv("OPENAPI_KEY")
        self.client = OpenAI(api_key=self.key)
        self.msg = copy.deepcopy(system_msg)

    def add_context(self, role, message):
        self.msg.append({"role": role, "content": message})

    def llm(self):
        try:
            completion = self.client.beta.chat.completions.parse(
                model="gpt-4o-mini-2024-07-18",
                messages=self.msg,
                response_format=self.Message,
            )
            content = completion.choices[0].message.content
            self.add_context("assistant", content)
            return content
        except Exception as e:
            print(f"Error Occured \n {e}")

    def initiate(self, query):
        self.add_context("user", f"MESSAGE FROM SUPERIOR AGENT: {query}")
        call_myself = True
        msg_to_agent = ""
        while call_myself != "false":
            spinner_thread = threading.Thread(target=sub_thinking_dots)
            spinner_thread.start()

            response = self.llm()

            spinner_thread.do_run = False
            spinner_thread.join()

            response_json = json.loads(response)
            msg_to_agent = response_json["message_to_Senior_agent"]
            sub_user_message(msg_to_agent)
            call_myself = response_json["call_myself"]

            tool = response_json["tool"]["tool_name"]
            code = response_json["tool"]["code"]
            query = response_json["tool"]["query"]

            if tool == "python" and code != "None":
                output = exec_code(code)
                error = output["error"]
                if error == True:
                    self.add_context(
                        "user", f"OUTPUT FROM PYTHON COMPILER {output['output']}"
                    )
                    whole = f'CODE: {code} \n ERROR: {output["output"]}'
                    fixer = Code_Fixer(whole)
                    solution = fixer.initiate()
                    self.add_context(
                        "user",
                        f"Suggestion to fix the code from another agent. Follow this to mitigate the error. {solution}",
                    )
                else:
                    self.add_context(
                        "user", f"OUTPUT FROM PYTHON COMPILER {output['output']}"
                    )
                sub_compiler_message(output)

            elif tool == "install" and query != "None":
                sub_install_module(query)
                output = install.install(query)
                sub_compiler_message(output)
                self.add_context("user", f"OUTPUT FROM INSTALLATION {output}")

            elif tool == "uninstall" and query != "None":
                sub_uninstall_module(query)
                output = install.uninstall(query)
                sub_compiler_message(output)
                self.add_context("user", f"OUTPUT FROM INSTALLATION {output}")

            elif tool == "search" and query != "None":
                spinner_thread = threading.Thread(target=sub_search_dots)
                spinner_thread.start()

                output = search.search(query)

                spinner_thread.do_run = False
                spinner_thread.join()

                sub_search_message()
                self.add_context(
                    "user",
                    f"OUTPUT FROM SEARCH RESULTS (NOT VISIBLE TO USER, must be summarized in message to user if needed): {output}",
                )

            elif tool == "picture" and query != "None":
                sub_picture_message()
                results = picture.picSearch(query)
                self.add_context(
                    "user",
                    f"OUTPUT FROM PICTURE SEARCH RESULTS {results}. Now you can proceed to download these using python if the user asked",
                )

        self.msg = copy.deepcopy(system_msg)
        return msg_to_agent
