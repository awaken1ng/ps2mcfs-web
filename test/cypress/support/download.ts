export const clearDownloads = () => cy.task('rmdir', Cypress.config('downloadsFolder'))

export const compareDownloadWithFixture = (dlPath: string, fixturePath: string) => {
  cy
    .readFile(`${Cypress.config('downloadsFolder')}/${dlPath}`, null)
    .then((download: Uint8Array) => cy
      .fixture(fixturePath, null)
      .then((fixture: Uint8Array) => {
        const sizeMatches = download.length === fixture.length
        assert(sizeMatches, 'files size does not match')

        // naively comparing bytes in a for loop is unusably slow with big files
        const filesMatch = indexedDB.cmp(download, fixture) === 0
        assert(filesMatch, 'files do not match')
      })
    )
}
