import app from '../support/app'
import { clearDownloads, compareDownloadWithFixture } from '../support/download'

describe('Import', () => {
  beforeEach(() => {
    cy.visit('/')
    cy.contains('No card loaded').should('exist')
  })

  it('imports and saves files', () => {
    const checkFiles = () => {
      app.entry('aaa-empty').should('exist')
      app.entry('bbb-unaligned').should('exist')
      app.entry('ccc-aligned').should('exist')

      clearDownloads()
      app.saveEntryFromMenu('aaa-empty')
      app.saveEntryFromMenu('bbb-unaligned')
      app.saveEntryFromMenu('ccc-aligned')
      compareDownloadWithFixture('aaa-empty', 'files/aaa-empty')
      compareDownloadWithFixture('bbb-unaligned', 'files/bbb-unaligned')
      compareDownloadWithFixture('ccc-aligned', 'files/ccc-aligned')
    }

    app.newCard()
    app.openImportFilesDialog()
    app.addFileToImportFromFixtures('files/aaa-empty')
    app.addFileToImportFromFixtures('files/bbb-unaligned')
    app.addFileToImportFromFixtures('files/ccc-aligned')
    app.importFiles()
    checkFiles()
    app.closeCard()
    app.expectUnsavedChanges()

    app.newCard()
    app.addFileToImportFromFixturesWithDragNDrop('files/aaa-empty')
    app.addFileToImportFromFixturesWithDragNDrop('files/bbb-unaligned')
    app.addFileToImportFromFixturesWithDragNDrop('files/ccc-aligned')
    app.importFiles()
    checkFiles()
  })
})

// Workaround for Cypress AE + TS + Vite
// See: https://github.com/quasarframework/quasar-testing/issues/262#issuecomment-1154127497
export {}
