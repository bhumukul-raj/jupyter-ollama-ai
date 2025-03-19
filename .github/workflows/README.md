# GitHub Actions Workflows

This directory contains GitHub Actions workflows for continuous integration and publishing of the JupyterLab AI Assistant Extension.

## Workflows

### CI Workflow (`ci.yml`)

This workflow runs on every push to the main branch and on pull requests. It:

1. Sets up Python and Node.js environments
2. Installs dependencies
3. Lints the code with ESLint
4. Builds the JupyterLab extension
5. Verifies the package can be imported

The CI workflow runs on multiple Python versions (3.7, 3.8, 3.9, 3.10) to ensure compatibility.

### Publish Workflow (`publish.yml`)

This workflow runs when a new release is created in GitHub. It:

1. Sets up Python and Node.js environments
2. Installs dependencies
3. Builds the extension and packages it
4. Publishes the package to PyPI

## Secrets Required

For the publishing workflow to function, you need to add the following secret to your GitHub repository:

- `PYPI_API_TOKEN`: An API token from PyPI for publishing the package

You can add this secret in your repository settings under "Settings > Secrets and variables > Actions".

## How to Create a Release

To trigger the publish workflow:

1. Create a new tag for your release (e.g., `v0.1.0`)
2. Go to GitHub's "Releases" section and click "Create a new release"
3. Use your tag, add a title and description
4. Publish the release

This will automatically trigger the publish workflow to deploy your package to PyPI. 