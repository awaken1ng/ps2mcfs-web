import app from '../support/app'
import { clearDownloads, compareDownloadWithFixture } from '../support/download'

describe('Card', () => {
  beforeEach(() => {
    cy.visit('/')
    cy.contains('No card loaded').should('exist')
  })

  it('creates and closes new memory card', () => {
    const assertIsNotLoaded = () => {
      cy.get('[data-cy="toolbar-vmc-new"]:not([disabled])').should('exist')
      cy.get('[data-cy="toolbar-vmc-open"]:not([disabled])').should('exist')
      cy.get('[data-cy="toolbar-vmc-saveAs"][disabled]').should('exist')
      cy.get('[data-cy="toolbar-vmc-close"][disabled]').should('exist')

      cy.get('[data-cy="toolbar-import-files"][disabled]').should('exist')
      cy.get('[data-cy="toolbar-import-psu"][disabled]').should('exist')
      cy.get('[data-cy="toolbar-mkdir"][disabled]').should('exist')

      cy.dataCy('toolbar-vmc-fileName').should('not.exist')
      cy.dataCy('toolbar-vmc-fileName-skeleton').should('exist')
      cy.get('[data-cy="toolbar-selectionToggle"][disabled]').should('exist')

      cy.dataCy('breadcrumbs-root').should('not.exist')
      cy.dataCy('breadcrumbs-skeleton').should('exist')

      cy.contains('No card loaded')
    }

    const assertIsLoaded = () => {
      cy.get('[data-cy="toolbar-vmc-new"]:not([disabled])').should('exist')
      cy.get('[data-cy="toolbar-vmc-open"]:not([disabled])').should('exist')
      cy.get('[data-cy="toolbar-vmc-saveAs"]:not([disabled])').should('exist')
      cy.get('[data-cy="toolbar-vmc-close"]:not([disabled])').should('exist')

      cy.get('[data-cy="toolbar-import-files"]:not([disabled])').should('exist')
      cy.get('[data-cy="toolbar-import-psu"]:not([disabled])').should('exist')
      cy.get('[data-cy="toolbar-mkdir"]:not([disabled])').should('exist')

      cy.dataCy('toolbar-vmc-fileName').should('exist')
      cy.dataCy('toolbar-vmc-fileName-skeleton').should('not.exist')
      cy.get('[data-cy="toolbar-selectionToggle"][disabled]').should('exist')

      cy.dataCy('breadcrumbs-root').should('exist')
      cy.dataCy('breadcrumbs-skeleton').should('not.exist')

      cy.contains('No items').should('exist')
    }

    assertIsNotLoaded()
    app.newCard()
    assertIsLoaded()
    app.closeCard()
    assertIsNotLoaded()
  })

  it('opens memory card from file', () => {
    // without ECC
    app.openCardFromFixtures('cards/foo-bar-baz.mcd')
    app.fileName().should('have.text', 'foo-bar-baz.mcd')
    app.entry('foo').should('exist')
    app.entry('bar').should('exist')
    app.entry('baz').should('exist')
    app.closeCard()
    cy.contains('No card loaded')

    // with ECC
    app.openCardFromFixtures('cards/foo-bar-baz.ps2')
    app.fileName().should('have.text', 'foo-bar-baz.ps2')
    app.entry('foo').should('exist')
    app.entry('bar').should('exist')
    app.entry('baz').should('exist')
  })

  it('saves memory card to file', () => {
    app.newCard()

    clearDownloads()
    app.saveCardWithoutEcc()
    compareDownloadWithFixture('ps2-memory-card.bin', 'cards/empty.mcd')

    clearDownloads()
    app.saveCardWithEcc()
    compareDownloadWithFixture('ps2-memory-card.bin', 'cards/empty.ps2')

    app.openCardFromFixtures('cards/foo-bar-baz.mcd')

    clearDownloads()
    app.saveCardWithoutEcc()
    compareDownloadWithFixture('foo-bar-baz.mcd', 'cards/foo-bar-baz.mcd')

    clearDownloads()
    app.saveCardWithEcc()
    compareDownloadWithFixture('foo-bar-baz.mcd', 'cards/foo-bar-baz.ps2')
  })
})

// Workaround for Cypress AE + TS + Vite
// See: https://github.com/quasarframework/quasar-testing/issues/262#issuecomment-1154127497
export {}
