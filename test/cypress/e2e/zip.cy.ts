import app from '../support/app'
import { clearDownloads } from '../support/download'

describe('Zip', () => {
  beforeEach(() => {
    cy.visit('/')
    cy.contains('No card loaded').should('exist')
  })

  it('exports directories and files to .zip', () => {
    app.openCardFromFixtures('cards/foo-bar-baz.mcd')

    clearDownloads()

    app.exportEntryAsZipFromMenu('foo')
    cy.readFile(`${Cypress.config('downloadsFolder')}/foo.zip`, null).should('not.be.null')

    app.entrySelect('foo')
    app.entrySelect('bar')
    app.exportEntryAsZipFromMenu('foo')
    cy.readFile(`${Cypress.config('downloadsFolder')}/foo-bar-baz.mcd.zip`, null).should('not.be.null')

    app.entry('baz').click()
    app.toggleSelection()
    app.exportEntryAsZipFromMenu('aaa-aligned')
    cy.readFile(`${Cypress.config('downloadsFolder')}/baz.zip`, null).should('not.be.null')
  })
})

// Workaround for Cypress AE + TS + Vite
// See: https://github.com/quasarframework/quasar-testing/issues/262#issuecomment-1154127497
export {}
