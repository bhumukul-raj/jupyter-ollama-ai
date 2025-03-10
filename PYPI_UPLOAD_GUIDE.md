# PyPI Registration Guide for Ollama JupyterLab AI Extension

This guide will walk you through the process of registering and publishing your JupyterLab extension on PyPI, which will allow users to install it with a simple `pip install ollama-jupyter-ai` command.

## Prerequisites

- Your project should have properly configured `pyproject.toml` and `setup.py` files (already done)
- You should have the required packaging tools installed

## Step 1: Install Required Packaging Tools

```bash
# Install the build package
python -m pip install --upgrade build

# Install twine for uploading to PyPI
python -m pip install --upgrade twine
```

## Step 2: Build Distribution Packages

```bash
# Build both source distribution and wheel packages
python -m build
```

This will create a `dist/` directory containing your package distributions (`.tar.gz` and `.whl` files).

    NOTE: # Install the package locally
    ```bash 
    pip install ./dist/ollama_jupyter_ai-1.0.0-py3-none-any.whl 
    ```
## Step 3: Test Your Package Locally

```bash
# Uninstall any existing version
pip uninstall -y ollama-jupyter-ai

# Install your package locally
pip install -e .

# Verify the extension is installed
jupyter labextension list | grep -i ollama-jupyter-ai
```

## Step 4: Register Accounts on PyPI and TestPyPI

### PyPI Account
1. Visit https://pypi.org/account/register/
2. Create an account
3. Verify your email address

### TestPyPI Account
1. Visit https://test.pypi.org/account/register/
2. Create an account (you can use the same email but might need a different username)
3. Verify your email address

## Step 5: Create API Tokens for Secure Upload

Using API tokens is more secure than passwords:

### For TestPyPI:
1. Log in to https://test.pypi.org
2. Go to Account Settings → API tokens
3. Create a token with the "Upload" scope
4. Save the token securely (it will only be shown once)

### For PyPI:
1. Log in to https://pypi.org
2. Go to Account Settings → API tokens
3. Create a token with the "Upload" scope
4. Save the token securely (it will only be shown once)

## Step 6: Upload to TestPyPI First (Recommended)

TestPyPI is a separate instance of the Python Package Index that allows you to test your package distribution before uploading to the real PyPI.

```bash
# Upload to TestPyPI using token authentication
python -m twine upload --repository testpypi --username __token__ --password pypi-YOUR-TEST-PYPI-TOKEN dist/*
```

Alternatively, you can use the repository URL directly:

```bash
python -m twine upload --repository-url https://test.pypi.org/legacy/ --username __token__ --password pypi-YOUR-TEST-PYPI-TOKEN dist/*
```

## Step 7: Test Installation from TestPyPI

Since TestPyPI doesn't have all dependencies, install them from the main PyPI first:

```bash
# Install dependencies from main PyPI
pip install jupyterlab>=4.0.0

# Remove local installation
pip uninstall -y ollama-jupyter-ai

# Install from TestPyPI
pip install --index-url https://test.pypi.org/simple/ ollama-jupyter-ai

# Verify installation
jupyter labextension list | grep -i ollama-jupyter-ai
```

## Step 8: Upload to the Real PyPI

Once you've verified everything works correctly:

```bash
# Upload to PyPI using token authentication
python -m twine upload --username __token__ --password pypi-YOUR-PYPI-TOKEN dist/*
```

## Step 9: Test Installation from PyPI

```bash
# Remove local installation
pip uninstall -y ollama-jupyter-ai

# Install from PyPI
pip install ollama-jupyter-ai

# Verify installation
jupyter labextension list | grep -i ollama-jupyter-ai
```

## Updating Your Package

When you need to update your package:

1. Update the version number in `pyproject.toml` and `setup.py`
2. Rebuild the package: `python -m build`
3. Upload the new version to TestPyPI first: `python -m twine upload --repository testpypi --username __token__ --password pypi-YOUR-TEST-PYPI-TOKEN dist/*`
4. Test the new version from TestPyPI
5. Upload the new version to PyPI: `python -m twine upload --username __token__ --password pypi-YOUR-PYPI-TOKEN dist/*`

## Configuring .pypirc for Easier Uploads

You can create a `.pypirc` file in your home directory to store your repository configurations:

```
[distutils]
index-servers =
    pypi
    testpypi

[pypi]
username = __token__
password = pypi-YOUR-PYPI-TOKEN

[testpypi]
repository = https://test.pypi.org/legacy/
username = __token__
password = pypi-YOUR-TEST-PYPI-TOKEN
```

With this file, you can simply run:
```bash
python -m twine upload --repository testpypi dist/*
python -m twine upload dist/*
```

## Additional Resources

- [Packaging Python Projects](https://packaging.python.org/tutorials/packaging-projects/)
- [PyPI Configuration for Twine](https://twine.readthedocs.io/en/latest/#configuration)
- [JupyterLab Extension Documentation](https://jupyterlab.readthedocs.io/en/stable/extension/extension_dev.html)
- [TestPyPI Documentation](https://test.pypi.org/help/) 