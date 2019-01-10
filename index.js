const visit = require('unist-util-visit')
const slash = require(`slash`)
const path = require(`path`)
const isRelativeUrl = require(`is-relative-url`)
const _ = require('lodash');
const fsExtra = require(`fs-extra`)

const DEPLOY_DIR = 'public'

module.exports = (
    { files, markdownNode, markdownAST, pathPrefix, getNode, reporter, cache },
    pluginOptions
  ) => {

    const filesToCopy = [];

    // find any GifPlayer html nodes
    visit(markdownAST, 'html', node => {
        // console.log('html node', node.value);
        const match = /<GifPlayer gif="([^"]+)"[^\/]*\/>/.exec(node.value);
        if (match) {
            const url = match[1];
            // console.log('found gif player with url', url);

            const parentNode = getNode(markdownNode.parent);

            if (parentNode && parentNode.dir && isRelativeUrl(url)) {
                const imagePath = slash(path.join(parentNode.dir, url));
            
                const file = _.find(files, f => {
                    return f.absolutePath === imagePath;
                });

                if (file) {
                    // console.log('found file node', file);

                    const newFilename = `${file.name}-${file.internal.contentDigest}.${file.extension}`;

                    node.value = node.value.replace(url, `/${newFilename}`);

                    filesToCopy.push({
                        from: file.absolutePath,
                        to: path.posix.join(process.cwd(), DEPLOY_DIR, newFilename)
                    })
                }
            }
        }
    })

    return Promise.all(_.map(filesToCopy, ftc => {
        if (!fsExtra.existsSync( ftc.to)) {
            return new Promise(function(resolve, reject) {

                try {
                    fsExtra.ensureDir(path.dirname(ftc.to), () => {
                        fsExtra.copy(ftc.from, ftc.to, resolve);
                    })
                } catch (err) {
                    console.error(`GifPlayer error copying file`, err)
                    reject(err);
                }                   
            })         
        }        
        return Promise.resolve();
    }));

  }