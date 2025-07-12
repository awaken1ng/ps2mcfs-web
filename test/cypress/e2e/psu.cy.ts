import app from '../support/app'
import { clearDownloads, compareDownloadWithFixture } from '../support/download'

describe('PSU', () => {
  beforeEach(() => {
    cy.visit('/')
    cy.contains('No card loaded').should('exist')
  })

  it('imports .psu', () => {
    app.newCard()
    app.importPsuFromFixturesWithoutOverwrite('psu/foo-empty.psu')
    app.entry('foo').click()
    app.entry('aaa-empty').should('exist')
    app.entry('bbb-empty').should('exist')
    app.entry('ccc-empty').should('exist')
    clearDownloads()
    app.saveEntryFromMenu('aaa-empty')
    app.saveEntryFromMenu('bbb-empty')
    app.saveEntryFromMenu('ccc-empty')
    compareDownloadWithFixture('aaa-empty', 'files/aaa-empty')
    compareDownloadWithFixture('bbb-empty', 'files/bbb-empty')
    compareDownloadWithFixture('ccc-empty', 'files/ccc-empty')

    app.deleteEntryFromMenu('ccc-empty')
    app.importPsuFromFixturesWithoutOverwrite('psu/foo-empty.psu')
    app.entry('aaa-empty').should('exist')
    app.entry('bbb-empty').should('exist')
    app.entry('ccc-empty').should('exist')

    cy.dataCy('entry-up').click()
    app.entry('foo').should('exist')

    app.importPsuFromFixturesWithoutOverwrite('psu/bar-unaligned.psu')
    app.entry('bar').click()
    app.entry('aaa-unaligned').should('exist')
    app.entry('bbb-unaligned').should('exist')
    app.entry('ccc-unaligned').should('exist')
    clearDownloads()
    app.saveEntryFromMenu('aaa-unaligned')
    app.saveEntryFromMenu('bbb-unaligned')
    app.saveEntryFromMenu('ccc-unaligned')
    compareDownloadWithFixture('aaa-unaligned', 'files/aaa-unaligned')
    compareDownloadWithFixture('bbb-unaligned', 'files/bbb-unaligned')
    compareDownloadWithFixture('ccc-unaligned', 'files/ccc-unaligned')

    cy.dataCy('entry-up').click()
    app.entry('foo').should('exist')
    app.entry('bar').should('exist')

    app.importPsuFromFixturesWithoutOverwrite('psu/baz-aligned.psu')
    app.entry('baz').click()
    app.entry('aaa-aligned').should('exist')
    app.entry('bbb-aligned').should('exist')
    app.entry('ccc-aligned').should('exist')
    clearDownloads()
    app.saveEntryFromMenu('aaa-aligned')
    app.saveEntryFromMenu('bbb-aligned')
    app.saveEntryFromMenu('ccc-aligned')
    compareDownloadWithFixture('aaa-aligned', 'files/aaa-aligned')
    compareDownloadWithFixture('bbb-aligned', 'files/bbb-aligned')
    compareDownloadWithFixture('ccc-aligned', 'files/ccc-aligned')

    cy.dataCy('entry-up').click()
    app.entry('foo').should('exist')
    app.entry('bar').should('exist')
    app.entry('baz').should('exist')
  })

  it('exports files to .psu', () => {
    app.openCardFromFixtures('cards/foo-bar-baz.mcd')
    clearDownloads()

    app.exportEntryAsPsuFromMenu('foo')
    compareDownloadWithFixture('foo.psu', 'psu/foo-empty.psu')

    app.exportEntryAsPsuFromMenu('bar')
    compareDownloadWithFixture('bar.psu', 'psu/bar-unaligned.psu')

    app.exportEntryAsPsuFromMenu('baz')
    compareDownloadWithFixture('baz.psu', 'psu/baz-aligned.psu')
  })
})

// Workaround for Cypress AE + TS + Vite
// See: https://github.com/quasarframework/quasar-testing/issues/262#issuecomment-1154127497
export {}
