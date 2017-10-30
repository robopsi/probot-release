# Probot: Release

> a GitHub App built with [probot](https://github.com/probot/probot) that
> publishes build artifacts to various third party services.

![](https://user-images.githubusercontent.com/1433023/32178062-1a715f32-bd8c-11e7-9d4d-7e51593a8f28.png)

## Table of Contents

- [Configuration](#configuration)
  - [GitHub](#github-github)
  - [NPM](#npm-npm)
  - [Python Package Index](#python-package-index-pypi)
  - [Cocoapods](#cocoapods-pods)
  - [Homebrew](#homebrew-brew)
- [Setup](#setup)
  - [Github App](#github-app)
  - [Amazon S3 Bucket](#amazon-s3-bucket)
  - [Development](#development)
- [Deployment](#deployment)

## Configuration

The bot will only be active in repositories that contain `.github/release.yml`.
In these repositories it will listen for tags and start a release if all status
checks associated to the tag's commit are successful. In case a commit has no
status checks, the release is skipped.

The configuration specifies which release targets to run for the repository.
To run more targets, list the target identifiers under the `target` key.
If the target key is empty, the bot defaults to the `"github"` target:

```yaml
targets:
  - name: github
```

### GitHub (`github`)

Create a release on Github. If a Markdown changelog is present in the
repository, this target tries to read the release name and description from
the changelog. Otherwise, defaults to the tag name and tag's commit message.

**Environment**

*none*

**Configuration**

| Option      | Description                                                    |
| ----------- | -------------------------------------------------------------- |
| `changelog` | **optional**. Path to the changelog file. Defaults to `CHANGELOG.md` |

**Example:**

```yaml
targets:
  - name: github
    changelog: CHANGES
```

### NPM (`npm`)

Releases a NPM package to the public registry. This requires a package tarball
generated by `npm pack` in the release assets. The file will be uploaded to
the registry with `npm publish`. This requires NPM to be authenticated with
sufficient permissions to publish the package.

**Environment**

The `npm` utility must be installed on the system.

| Name      | Description                                                 |
| --------- | ----------------------------------------------------------- |
| `NPM_BIN` | **optional**. Path to the npm executable. Defaults to `npm` |

**Configuration**

*none*

**Example**

```yaml
targets:
  - npm
```

### Python Package Index (`pypi`)

Uploads source dists and wheels to the Python Package Index with twine. The
source code bundle or wheels must be in the release assets.

**Environment**

The `twine` package must be installed on the system.

| Name             | Description                                           |
| ---------------- | ----------------------------------------------------- |
| `TWINE_USERNAME` | User name for PyPI with access rights for the package |
| `TWINE_PASSWORD` | Password for the PyPI user                            |
| `TWINE_BIN`      | **optional**. Path to twine. Defaults to `twine`      |

**Configuration**

*none*

**Example**

```yaml
targets:
  - pypi
```

### Cocoapods (`pods`)

Pushes a new podspec to the central cocoapods repository. The Podspec is
fetched from the Github repository with the tag that is being released. No
release assets are required for this target.

**Environment**

The `cocoapods` gem must be installed on the system.

| Name                    | Description                               |
| ----------------------- | ----------------------------------------- |
| `COCOAPODS_TRUNK_TOKEN` | The access token to the cocoapods account |

**Configuration**

| Option | Description                                |
| ------ | ------------------------------------------ |
| `spec` | Path to the Podspec file in the repository |

**Example**

```yaml
targets:
  - name: pods
    spec: MyProject.podspec
```

### Homebrew (`brew`)

Pushes a new or updated homebrew formula to a brew tap repository. The formula
is committed directly to the master branch of the tap on GitHub, therefore the
bot needs rights to commit to `master` on that repository. Therefore, formulas
on `homebrew/core` are not supported, yet.

The tap is configured with the mandatory `tap` parameter in the same format as
the `brew` utility. A tap `<org>/<name>` will expand to the GitHub repository
`github.com:<org>/homebrew-<name>`.

The formula contents are given as configuration value and can be interpolated
with `${ variable }`. The interpolation context contains the following
variables:

 - `ref`: The tag's reference name. Usually the version number
 - `sha`: The tag's commit SHA
 - `checksums`: A map containing sha256 checksums for every release asset. Use
   the full filename to access the sha, e.g. `checksums['MyProgram.exe']`

**Environment**

*none*

**Configuration**

| Option | Description |
| ------ | ----------- |
| `tap`      | The name of the homebrew tap used to access the GitHub repo     |
| `template` | The template for contents of the formula file (ruby code)       |
| `formula`  | **optional**. Name of the formula. Defaults to the repository name |
| `path`     | **optional**. Path to store the formula in. Defaults to `Formula` |

**Example**

```yaml
targets:
  - name: brew
    tap: octocat/tools     # Expands to github.com:octocat/homebrew-tools
    formula: myproject     # Creates the file myproject.rb
    path: HomebrewFormula  # Creates the file in HomebrewFormula/
    template: >
      class MyProject < Formula
        desc "This is a test for homebrew formulae"
        homepage "https://github.com/octocat/my-project"
        url "https://github.com/octocat/my-project/releases/download/${ref}/binary-darwin"
        version "${ref}"
        sha256 "${checksums['binary-darwin']}"

        def install
          mv "binary-darwin", "myproject"
          bin.install "myproject"
        end
      end
```

## Setup

This Probot app requires authentication tokens and credentials for third party
apps in environment variables. Depending on the release targets you wish to use
in your installation, you may omit some of the environment variables below.

The project contains a template for environment variables located at
`.env.example`. Copy this file to `.env` in the project root and adjust all
environment variables.

### Github App

First, create a GitHub App by following the instructions [here](https://probot.github.io/docs/deployment/#create-the-github-app).
Then, make sure to download the private key and place it in the root directory
of this application or set it via the `PRIVATE_KEY` environment variable.
Finally, set the following environment variables:

| Name             | Description                                          |
| ---------------- | ---------------------------------------------------- |
| `APP_ID`         | Unique ID of the GitHub App                          |
| `WEBHOOK_SECRET` | Random webhook secret configured during app creation |


### Amazon S3 Bucket

In the most basic setup, this app will download release artifacts from S3 and
publish them on the GitHub release page. This requires the following
environment variables:

| Name            | Description                                      |
| --------------- | ------------------------------------------------ |
| `S3_BUCKET`     | The name of the S3 bucket to download files from |
| `S3_ACCESS_KEY` | The public access key for the bucket             |
| `S3_SECRET_KEY` | The secret access key for the bucket             |

Inside this bucket, the bot will always look for a folder with the schema
`<organization>/<repository>/<commit-sha>` and download all direct files.
Depending on the release targets' implementations, some or all of these files
will be processed and re-uploaded to third-party services.

### Development

To start the development server, make sure the following environment variables
are set:

| Name        | Description                                       |
| ----------- | ------------------------------------------------- |
| `DRY_RUN`   | Disables actual releases. Set to `true`           |
| `SUBDOMAIN` | Subdomain for localtunnel to receive webhooks     |
| `LOG_LEVEL` | Sets the loggers output verbosity. Set to `debug` |

Then, install dependencies and run the bot with:

```sh
# Install dependencies
npm install

# Run the bot
npm start
```

## Deployment

If you would like to run your own instance of this app, see the [docs for deployment](https://probot.github.io/docs/deployment/).

This app requires these **Permissions** for the GitHub App:

 - **Commit statuses**: Read-only
 - **Repository contents**: Read & write

Also, the following **Events** need to be subscribed:

 - **Status**: Commit status updated from the API
 - **Create**: Branch or tag created
 - **Delete**: Branch or tag deleted

Also, make sure all required environment variables are present in the production environment.
