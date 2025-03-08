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
    ("share/jupyter/labextensions/ollama-jupyter-ai", lab_path, "**"),
    ("share/jupyter/labextensions/ollama-jupyter-ai", HERE, "install.json"),
]

# Create a custom post-build hook to fix the nested static directory issue
def post_build_hook(build_cmd, path, build_dir):
    print(f"Running post-build hook for {path} -> {build_dir}")
    
    # First run the normal build
    npm_builder(build_cmd=build_cmd, path=path, build_dir=build_dir)()
    
    # Check if we have the nested static directory issue
    static_dir = os.path.join(build_dir, "static")
    if os.path.exists(static_dir) and os.path.isdir(static_dir):
        print("Fixing nested static directory structure...")
        # Create a temporary directory
        tmp_dir = os.path.join(HERE, "tmp_static")
        os.makedirs(tmp_dir, exist_ok=True)
        
        # Move all files from static/ to the tmp directory
        for item in os.listdir(static_dir):
            src = os.path.join(static_dir, item)
            dst = os.path.join(tmp_dir, item)
            shutil.move(src, dst)
            
        # Remove all files from the build_dir except package.json
        for item in os.listdir(build_dir):
            if item != "package.json":
                path = os.path.join(build_dir, item)
                if os.path.isdir(path):
                    shutil.rmtree(path)
                else:
                    os.remove(path)
        
        # Move all files from tmp_dir back to build_dir
        for item in os.listdir(tmp_dir):
            src = os.path.join(tmp_dir, item)
            dst = os.path.join(build_dir, item)
            shutil.move(src, dst)
            
        # Remove the temporary directory
        shutil.rmtree(tmp_dir)
        print("Directory structure fixed.")
        
    # Copy install.json to the build directory if it doesn't exist
    install_json_path = os.path.join(build_dir, "install.json")
    if not os.path.exists(install_json_path):
        src_install_json = os.path.join(HERE, "install.json")
        if os.path.exists(src_install_json):
            shutil.copy(src_install_json, install_json_path)
            print(f"Copied install.json to {build_dir}")
    
    # Print the contents of the build directory for debugging
    print(f"Build directory contents after post-build hook:")
    for item in os.listdir(build_dir):
        print(f"  - {item}")

# Create a custom builder function that applies our post-build hook
custom_builder = lambda: post_build_hook(
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
    ],
    entry_points={
        "jupyterlab.extensions": ["ollama-jupyter-ai = ollama_jupyter_ai"]
    }
)

if __name__ == "__main__":
    setuptools.setup(**setup_args) 