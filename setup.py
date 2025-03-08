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
    ("share/jupyter/labextensions/ollama-jupyter-ai", os.path.join(HERE, name, "static"), "**/*"),
    ("share/jupyter/labextensions/ollama-jupyter-ai", HERE, "install.json"),
]

# Post build hook to ensure install.json is properly copied
def post_build_hook(build_dir, prefix):
    # Ensure install.json exists in the static directory
    install_json_content = {
        "packageName": "ollama-jupyter-ai",
        "packageManager": "python",
        "uninstallInstructions": "Use your Python package manager (pip) to uninstall the package.",
        "extension": "./static/remoteEntry.js"
    }
    
    # Create install.json in the static directory
    static_dir = os.path.join(HERE, name, "static")
    static_static_dir = os.path.join(static_dir, "static")
    
    # Make sure the directories exist
    os.makedirs(static_dir, exist_ok=True)
    os.makedirs(static_static_dir, exist_ok=True)
    
    # Find the actual remoteEntry.js file
    import glob
    remote_entry_files = glob.glob(os.path.join(static_static_dir, "remoteEntry.*.js"))
    if remote_entry_files:
        # Update the extension path with the actual filename
        remote_entry_file = os.path.basename(remote_entry_files[0])
        install_json_content["extension"] = f"./static/{remote_entry_file}"
    
    # Write install.json to static directory
    with open(os.path.join(static_dir, "install.json"), "w") as f:
        json.dump(install_json_content, f, indent=2)
    
    # Copy install.json to static/static directory
    shutil.copy(os.path.join(static_dir, "install.json"), os.path.join(static_static_dir, "install.json"))
    
    print(f"Created install.json in {static_dir} and {static_static_dir}")

# Create a standard npm builder that directly builds to the static directory
custom_builder = npm_builder(
    build_cmd="build:prod",
    path=os.path.join(HERE, name, "labextension"),
    build_dir=os.path.join(HERE, name, "static")
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