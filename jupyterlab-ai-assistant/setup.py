#!/usr/bin/env python
# coding: utf-8

# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

try:
    from jupyter_packaging import (
        wrap_installers,
        npm_builder,
        get_data_files
    )
except ImportError:
    # If jupyter_packaging is not available, fallback to simple setup
    wrap_installers = lambda *args, **kwargs: lambda a: a
    npm_builder = lambda *args, **kwargs: None
    get_data_files = lambda *args: []

import os
from setuptools import setup, find_packages

HERE = os.path.abspath(os.path.dirname(__file__))

# The name of the project
name = "jupyterlab_ai_assistant"

# Get the version
version_ns = {}
with open(os.path.join(name, "_version.py")) as f:
    exec(f.read(), {}, version_ns)

# Representative files that should exist after a successful build
ensured_targets = [
    "jupyterlab_ai_assistant/labextension/static/style.js",
    "jupyterlab_ai_assistant/labextension/package.json",
]

data_files_spec = [
    (
        "share/jupyter/labextensions/jupyterlab-ai-assistant",
        "jupyterlab_ai_assistant/labextension",
        "**",
    ),
    (
        "share/jupyter/labextensions/jupyterlab-ai-assistant",
        ".",
        "install.json",
    ),
    (
        "etc/jupyter/jupyter_server_config.d",
        "jupyter-config/jupyter_server_config.d",
        "jupyterlab_ai_assistant.json",
    ),
    (
        "etc/jupyter/jupyter_notebook_config.d",
        "jupyter-config/jupyter_notebook_config.d",
        "jupyterlab_ai_assistant.json",
    ),
]

# Define the builder
builder = npm_builder(
    build_cmd="build:prod", 
    npm=["jlpm"],
    build_dir=HERE
)

# Setup the command
cmdclass = wrap_installers(
    pre_develop=builder, 
    pre_dist=builder,
    ensured_targets=ensured_targets
)

long_description = ""
with open(os.path.join(HERE, "README.md"), encoding="utf-8") as f:
    long_description = f.read()

setup_args = dict(
    name=name,
    version=version_ns["__version__"],
    description="A JupyterLab extension that integrates Ollama-powered AI assistance directly into notebooks",
    long_description=long_description,
    long_description_content_type="text/markdown",
    cmdclass=cmdclass,
    packages=find_packages(),
    install_requires=[
        "jupyter_server>=1.6,<2",
        "requests>=2.25.0",
    ],
    zip_safe=False,
    include_package_data=True,
    python_requires=">=3.7",
    license="BSD-3-Clause",
    platforms="Linux, Mac OS X, Windows",
    keywords=["Jupyter", "JupyterLab", "JupyterLab3", "AI", "Ollama"],
    classifiers=[
        "License :: OSI Approved :: BSD License",
        "Programming Language :: Python",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.7",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Framework :: Jupyter",
        "Framework :: Jupyter :: JupyterLab",
        "Framework :: Jupyter :: JupyterLab :: 3",
        "Framework :: Jupyter :: JupyterLab :: Extensions",
        "Framework :: Jupyter :: JupyterLab :: Extensions :: Prebuilt",
    ],
    data_files=get_data_files(data_files_spec),
)

if __name__ == "__main__":
    setup(**setup_args)
