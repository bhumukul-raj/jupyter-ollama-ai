#!/usr/bin/env python
# coding: utf-8

# Copyright (c) 2024 bhumukulraj
# Distributed under the terms of the MIT License.

"""
This is a minimal setup.py file for compatibility with tools that don't yet
fully support PEP 518/pyproject.toml-based builds.

The project's build system is actually defined in pyproject.toml.
"""

from setuptools import setup

setup(
    name="jupyterlab_ai_assistant",
    description="A JupyterLab extension that integrates Ollama-powered AI assistance directly into notebooks",
    long_description=open("README.md").read(),
    long_description_content_type="text/markdown",
    include_package_data=True,
    install_requires=[
        "jupyterlab>=4.0.0,<5.0.0",
        "jupyter_server>=2.0.0",
        "aiohttp",
        "requests>=2.25.0",
    ],
)
