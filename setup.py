import json
import os
import shutil
from pathlib import Path

from jupyter_packaging import (
    wrap_installers,
    npm_builder,
    get_data_files
)
import setuptools

HERE = os.path.abspath(os.path.dirname(__file__))

# The name of the project
name = "ollama_jupyter_ai"

# Set version explicitly to 1.0.0
version = "1.0.0"

# Set paths
lab_path = os.path.join(HERE, name, "static")

# Representative files that should exist after a successful build - used as build target checks
jstargets = [
    os.path.join(lab_path, "package.json"),
    os.path.join(lab_path, "install.json"),
]

# This dictionary will be used to specify package_data
package_data_spec = {
    name: ["*", "static/**/*", "labextension/**/*"],
}

# Files to be included in the Python package distribution
data_files_spec = [
    ("share/jupyter/labextensions/ollama-jupyter-ai", lab_path, "**/*"),
    ("share/jupyter/labextensions/ollama-jupyter-ai", HERE, "install.json"),
]

def post_build_hook():
    """
    Post-build hook to ensure all necessary files are in the correct location
    """
    # Ensure the static directory exists
    static_dir = os.path.join(HERE, name, "static")
    os.makedirs(static_dir, exist_ok=True)
    
    # Copy install.json from the project root to static directory
    src_install_json = os.path.join(HERE, "install.json")
    dest_install_json = os.path.join(static_dir, "install.json")
    
    if os.path.exists(src_install_json):
        shutil.copy(src_install_json, dest_install_json)
        print(f"Copied install.json to {dest_install_json}")
    else:
        print(f"Warning: Source install.json at {src_install_json} does not exist")
    
    # Check if the build files were properly created
    if not os.path.exists(os.path.join(static_dir, "remoteEntry.js")):
        # Look for any remoteEntry*.js files in the static directory
        remote_entries = [f for f in os.listdir(static_dir) 
                         if f.startswith("remoteEntry") and f.endswith(".js")]
        
        if remote_entries:
            # If we find a remote entry file with a hash, create a symlink or copy it
            src_remote_entry = os.path.join(static_dir, remote_entries[0])
            dest_remote_entry = os.path.join(static_dir, "remoteEntry.js")
            shutil.copy(src_remote_entry, dest_remote_entry)
            print(f"Copied {src_remote_entry} to {dest_remote_entry}")
    
    print(f"Static directory contents: {os.listdir(static_dir)}")

# Create a standard npm builder that directly builds to the static directory
custom_builder = npm_builder(
    build_cmd="build:prod",
    path=os.path.join(HERE, name, "labextension"),
    build_dir=os.path.join(HERE, name, "static"),
    source_dir=os.path.join(HERE, name, "labextension", "src")
)

cmdclass = {}
data_files = get_data_files(data_files_spec)

# Update the cmdclass dictionary with our custom builder
cmdclass.update(
    wrap_installers(
        pre_develop=custom_builder,
        pre_dist=custom_builder,
        post_develop=post_build_hook,
        post_dist=post_build_hook,
        ensured_targets=[
            os.path.join(lab_path, "package.json"),
            os.path.join(lab_path, "remoteEntry.*.js"),
        ]
    )
)

setup_args = dict(
    name=name,
    version=version,
    url="https://github.com/bhumukul-raj/ollama-ai-assistant-project",
    author="Bhumukul Raj",
    description="AI-powered JupyterLab extension using Ollama for local LLM integration",
    long_description=open("README.md").read(),
    long_description_content_type="text/markdown",
    cmdclass=cmdclass,
    packages=setuptools.find_packages(),
    install_requires=[
        "jupyterlab>=4.0.0,<5.0.0",
        "jupyter_packaging>=0.10.0",
    ],
    zip_safe=False,
    include_package_data=True,
    package_data=package_data_spec,
    data_files=data_files,
    python_requires=">=3.8",
    license="MIT",
    platforms="Linux, Mac OS X, Windows",
    keywords=["Jupyter", "JupyterLab", "JupyterLab4", "Ollama", "AI", "Assistant"],
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
    ]
)

if __name__ == "__main__":
    setuptools.setup(**setup_args) 