import json
import os

from jupyter_packaging import (
    wrap_installers,
    npm_builder,
    get_data_files
)
import setuptools

HERE = os.path.abspath(os.path.dirname(__file__))

# The name of the project
name = "ollama_jupyter_ai"

# Get the version
with open(os.path.join(HERE, name, "labextension", "package.json")) as f:
    version = json.load(f)["version"]

lab_path = os.path.join(HERE, name, "labextension")

# Representative files that should exist after a successful build
jstargets = [
    os.path.join(lab_path, "package.json"),
]

package_data_spec = {
    name: ["*"],
}

data_files_spec = [
    ("share/jupyter/labextensions/%s" % name, lab_path, "**"),
    ("share/jupyter/labextensions/%s" % name, HERE, "install.json"),
]

builder = npm_builder(
    build_cmd="build:prod", 
    path=lab_path,
    build_dir=os.path.join(lab_path, "static")
)

cmdclass = {}
data_files = get_data_files(data_files_spec)

cmdclass.update(
    wrap_installers(
        pre_develop=builder,
        pre_dist=builder
    )
)

setup_args = dict(
    name=name,
    version=version,
    url="https://github.com/yourusername/ollama-jupyter-ai",
    author="Your Name",
    description="AI-powered JupyterLab extension using Ollama for local LLM integration",
    long_description=open("README.md").read(),
    long_description_content_type="text/markdown",
    cmdclass=cmdclass,
    packages=setuptools.find_packages(),
    install_requires=[
        "jupyterlab>=4.0.0,<5.0.0",
    ],
    zip_safe=False,
    include_package_data=True,
    data_files=data_files,
    python_requires=">=3.8",
    license="MIT",
    platforms="Linux, Mac OS X, Windows",
    keywords=["Jupyter", "JupyterLab", "JupyterLab3"],
    classifiers=[
        "License :: OSI Approved :: MIT License",
        "Programming Language :: Python",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Framework :: Jupyter",
        "Framework :: Jupyter :: JupyterLab",
        "Framework :: Jupyter :: JupyterLab :: 4",
        "Framework :: Jupyter :: JupyterLab :: Extensions",
        "Framework :: Jupyter :: JupyterLab :: Extensions :: Prebuilt",
    ],
)

if __name__ == "__main__":
    setuptools.setup(**setup_args) 