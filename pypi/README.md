# PyPI Upload Scripts

This directory contains scripts for securely uploading Python distribution packages to both TestPyPI and PyPI. These scripts are designed to be secure even when committed to public repositories like GitHub.

## Contents

- **Test Environment**
  - `upload_to_testpypi.py` - Python script for uploading to TestPyPI
  - `upload_to_testpypi.sh` - Bash wrapper script for TestPyPI uploads

- **Production Environment**
  - `upload_to_pypi.py` - Python script for uploading to main PyPI
  - `upload_to_pypi.sh` - Bash wrapper script for PyPI uploads

## Features

- ✅ Secure credential handling through environment variables
- ✅ No hardcoded credentials in the code
- ✅ Auto-installation of dependencies (twine)
- ✅ Colorful terminal output and clear error reporting
- ✅ GitHub-friendly (secure when included in repositories)
- ✅ Support for custom distribution directories
- ✅ Interactive credential prompting when needed
- ✅ Production confirmation to prevent accidental uploads

## Prerequisites

Before using these scripts, make sure you have:

1. **Python 3** installed on your system
2. **Distribution files** - Build your package distribution files (.whl and/or .tar.gz) before uploading
3. **PyPI/TestPyPI accounts** 
   - For TestPyPI: Register at https://test.pypi.org/account/register/
   - For PyPI: Register at https://pypi.org/account/register/

## Recommended Workflow

For package releases, we recommend this workflow:

1. Build your distribution packages
2. Upload to TestPyPI first and verify installation works
3. Only then upload to the main PyPI repository

## Usage Options

### TestPyPI (Testing)

#### Using the Bash Script (Recommended)

```bash
# Navigate to the pypi directory
cd pypi

# Run with default dist directory (../jupyterlab-ai-assistant/dist/)
./upload_to_testpypi.sh

# OR specify a custom dist directory
./upload_to_testpypi.sh /path/to/your/dist/folder
```

If you haven't set environment variables for your TestPyPI credentials, the script will prompt you to enter them interactively.

#### Using the TestPyPI Python Script Directly

```bash
# Set environment variables
export TESTPYPI_USERNAME="your-username"
export TESTPYPI_PASSWORD="your-password-or-token"

# Run with default dist directory
python upload_to_testpypi.py

# OR specify a custom dist directory
python upload_to_testpypi.py /path/to/your/dist/folder
```

### PyPI (Production)

⚠️ **CAUTION**: These scripts upload to the real PyPI repository. Your package will be publicly available to all Python users.

#### Using the Bash Script (Recommended)

```bash
# Navigate to the pypi directory
cd pypi

# Run with default dist directory
./upload_to_pypi.sh

# OR specify a custom dist directory
./upload_to_pypi.sh /path/to/your/dist/folder
```

The script will prompt for confirmation before uploading.

#### Using the PyPI Python Script Directly

```bash
# Set environment variables
export PYPI_USERNAME="your-username"
export PYPI_PASSWORD="your-password-or-token"

# Run with default dist directory
python upload_to_pypi.py

# OR specify a custom dist directory
python upload_to_pypi.py /path/to/your/dist/folder
```

## Secure Usage with GitHub

These scripts are designed to be secure when used with GitHub repositories:

### For Local Use

When running locally, you have two options:

1. **Set environment variables** before running the script:
   ```bash
   # For TestPyPI
   export TESTPYPI_USERNAME="your-username"
   export TESTPYPI_PASSWORD="your-password-or-token"
   
   # For PyPI
   export PYPI_USERNAME="your-username"
   export PYPI_PASSWORD="your-password-or-token"
   ```

2. **Allow interactive prompts** - The bash scripts will ask for credentials if they're not set in environment variables

### For GitHub Actions

For automated workflows, use GitHub Secrets:

1. **Add your credentials as GitHub repository secrets**:
   - Go to your repository on GitHub
   - Navigate to Settings → Secrets → Actions
   - Add the appropriate secrets for your target environment

2. **Use these secrets in your GitHub workflow**:

```yaml
# Example for TestPyPI
name: Upload to TestPyPI

on:
  push:
    tags:
      - 'v*'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
    
    - name: Set up Python
      uses: actions/setup-python@v2
      with:
        python-version: '3.x'
    
    - name: Install dependencies
      run: |
        python -m pip install --upgrade pip
        pip install build
    
    - name: Build package
      run: python -m build
    
    - name: Upload to TestPyPI
      run: |
        cd pypi
        python upload_to_testpypi.py ../dist
      env:
        TESTPYPI_USERNAME: ${{ secrets.TESTPYPI_USERNAME }}
        TESTPYPI_PASSWORD: ${{ secrets.TESTPYPI_PASSWORD }}
```

## Security Considerations

- **Never hardcode credentials** in your scripts or configuration files
- Use **API tokens** instead of your actual password when possible
- For GitHub Actions, always use **repository secrets**
- The scripts unset environment variables after use for added security
- Consider setting up **two-factor authentication** on your PyPI accounts

## Verifying Uploads

After uploading to TestPyPI, you can install your package with:

```bash
pip install --index-url https://test.pypi.org/simple/ --extra-index-url https://pypi.org/simple/ your-package-name
```

After uploading to PyPI, you can install your package with:

```bash
pip install your-package-name
```

## Troubleshooting

If you encounter issues:

- **Authentication errors**: Double-check your username and password/token
- **File not found errors**: Make sure the distribution directory exists and contains valid files
- **Permission errors**: Ensure both scripts are executable (`chmod +x *.py *.sh`)
- **Python not found**: Make sure Python 3 is installed and in your PATH
- **Version conflicts**: PyPI won't allow you to re-upload the same version. Always increment your version number.

## Contributing

Feel free to modify these scripts for your specific needs. If you make improvements, consider submitting them back to the project as pull requests. 