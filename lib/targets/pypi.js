const { shouldPerform } = require('dryrun');
const { basename, extname } = require('path');
const { spawn } = require('../utils');

/**
 * Command to launch twine
 */
const TWINE_BIN = process.env.TWINE_BIN || 'twine';

/**
 * White list for file extensions uploaded to PyPI
 */
const WHEEL_EXTENSIONS = ['.whl'];

/**
 * Uploads a wheel to PyPI using twine
 *
 * @param {string} path Absolute path to the wheel to upload
 * @returns {Promise} A promise that resolves when the upload has completed
 * @async
 */
function uploadAsset(path) {
  // TODO: Sign the wheel with "--sign"
  return spawn(TWINE_BIN, ['upload', path]);
}

/**
 * Uploads all files to PyPI using Twine
 *
 * Requires twine to be configured in the environment (see .env.example). Only
 * *.whl files are uploaded.
 *
 * @param {Context} context Enriched Github context
 * @param {string[]} files Absolute paths to the build artifacts
 * @returns {Promise} A promise that resolves when the release has finished
 * @async
 */
module.exports = async (context, files) => {
  const { logger, tag } = context;

  const wheelFiles = files.filter(file => WHEEL_EXTENSIONS.includes(extname(file)));
  if (wheelFiles.length === 0) {
    logger.info('Skipping PyPI release since there are no wheels');
    return;
  }

  const { owner, repo } = context.repo();
  logger.info(`Releasing ${wheelFiles.length} wheels for ${owner}/${repo} tag ${tag.ref} to PyPI`);

  await Promise.all(wheelFiles.map((file) => {
    logger.info(`Uploading asset "${basename(file)}" via twine`);
    return shouldPerform() && uploadAsset(file);
  }));

  logger.info('PyPI release completed');
};