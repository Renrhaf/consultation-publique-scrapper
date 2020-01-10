const cheerio = require('cheerio');
const puppeteer = require('puppeteer');
const fs = require('fs');
const ProgressBar = require('progress');

const url = 'http://www.consultations-publiques.developpement-durable.gouv.fr/projet-d-arrete-relatif-aux-prelevements-d-oies-en-a1913.html';
const commentsPerPage = 20;
const paginationKey = 'debut_forums';
const output = 'comments.json';

/**
 * Scape function.
 */
let scrape = async (baseUrl) => {
  // Erase previous file content.
  fs.writeFileSync(output, '');

  // Load initial page.
  const browser = await puppeteer.launch();
  const browserPage = await browser.newPage();
  await browserPage.goto(baseUrl);

  // Extract total number of pages to scrape.
  const html = await browserPage.content();
  const $global = cheerio.load(html);
  const totalComments = $global('#boxcentrale .entetecom + .pagination .pages a.lien_pagination:last-child').text();
  const totalPages = (totalComments/commentsPerPage);
  const bar = new ProgressBar('  scraping [:bar] :current/:total :percent :etas', {
    complete: '=',
    incomplete: ' ',
    width: 20,
    total: totalPages
  });

  console.log('Number of comments : ' + totalComments);

  // Iterate over each one.
  for (let page = 0; page < totalPages; page++) {
    let comments = [];

    const pagination = page * commentsPerPage;
    const pageUrl = url + '?' + paginationKey + '=' + pagination;
    await browserPage.goto(pageUrl);

    // Extract comments.
    const html = await browserPage.content();
    const $comments = cheerio.load(html);
    const commentsElements = $comments('#boxcentrale .forum-total .ligne-com');
    commentsElements.each(function () {
      const title = $comments(this).find('.titresujet').text();
      const commentText = $comments(this).find('.textesujet').text();

      comments.push({
        title: title,
        text: commentText,
      });
    });

    let stringifiedComments = JSON.stringify(comments);
    fs.appendFile(output, stringifiedComments, function (err) {
      if (err) return console.log(err);
    });

    bar.tick();
  }

  browser.close();
};

scrape(url).then(() => {
  console.log('All comments written to JSON file : ' + output);
});