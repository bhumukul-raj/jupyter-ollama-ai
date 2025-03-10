# Building and Testing

This guide explains how to build, test, and deploy the Ollama JupyterLab AI Assistant extension.

## Development Build

To build the extension for development:

```bash
# Install dependencies
pip install -e .
yarn install

# Build the extension in development mode
yarn build
jupyter labextension develop --overwrite .
```

## Production Build

To build the extension for production:

```bash
# Clean any previous builds
yarn clean

# Build for production
yarn build:prod

# Install the package
pip install -e .
```

## Testing

### Manual Testing

You can test the extension manually by:

1. Building the extension as described above
2. Starting JupyterLab: `jupyter lab`
3. Verifying the extension is loaded in JupyterLab

### Linting

To lint the TypeScript code:

```bash
# Run ESLint with auto-fixing
yarn lint

# Run ESLint check (shows warnings but doesn't fail)
yarn lint:check

# Run strict ESLint check (fails on warnings)
yarn lint:strict
```

#### Linting Standards

The project has ESLint configured with several rules:
- TypeScript naming conventions (interfaces should have 'I' prefix)
- No unused variables 
- No explicit 'any' types
- No console statements in production code

For CI/CD purposes, these are treated as warnings rather than errors to avoid blocking builds. However, these should be addressed during development to maintain code quality.

### Type Checking

To check the TypeScript types:

```bash
yarn type-check
```

## CI/CD Pipeline

The project includes a Continuous Integration and Continuous Deployment (CI/CD) pipeline using GitHub Actions.

### CI Workflow

The CI workflow (`ci.yml`) automatically runs on all pushes to the main branch and all pull requests. It performs:

- Testing with multiple Python versions (3.8, 3.9, 3.10, 3.11)
- TypeScript linting
- Type checking
- Building the extension
- Verifying the installation

This ensures that code changes don't break the extension and maintain code quality.

### Publish Workflow

The Publish workflow (`publish.yml`) automatically runs when a new GitHub release is created. It:

1. Builds the extension
2. Creates Python distribution packages
3. Publishes to Test PyPI for verification
4. Publishes to PyPI (for tagged releases)

This automates the release process and ensures consistent package deployments.

### Setting Up the CI/CD Pipeline

For repository maintainers, to set up the CI/CD pipeline:

1. Ensure the `.github/workflows/` directory exists with `ci.yml` and `publish.yml`
2. Set up required secrets in the GitHub repository settings:
   - `TEST_PYPI_USERNAME`
   - `TEST_PYPI_PASSWORD`
   - `PYPI_USERNAME`
   - `PYPI_PASSWORD`

## Creating a Release

To create a new release:

1. Update the version number in:
   - `pyproject.toml`
   - `package.json`
   - `ollama_jupyter_ai/labextension/package.json`

2. Commit the version changes and push to GitHub

3. Create a new release on GitHub with the version as the tag (e.g., `v1.0.1`)

4. The publish workflow will automatically build and publish the package to PyPI 