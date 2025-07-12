import app from '../support/app'

describe('Rm', () => {
  beforeEach(() => {
    cy.visit('/')
    cy.contains('No card loaded').should('exist')
  })

  it('deletes files and directories', () => {
    app.openCardFromFixtures('cards/foo-bar-baz.mcd')

    app.entry('foo').click()

    // should deselect when opening menu on unselected item
    app.entrySelect('aaa-empty')
    app.deleteEntryFromMenu('ccc-empty')
    app.entryByName('aaa-empty').should('exist')
    app.entryByName('ccc-empty').should('not.exist')

    // should remove all selected items
    app.entrySelect('aaa-empty')
    app.entrySelect('bbb-empty')
    app.deleteEntryFromMenu('bbb-empty')
    cy.contains('No items')

    cy.dataCy('entry-up').click()

    // should deselect when opening menu on unselected item
    app.entrySelect('bar')
    app.entrySelect('baz')
    app.deleteEntryFromMenu('foo')
    app.entryByName('foo').should('not.exist')
    app.entryByName('bar').should('exist')
    app.entryByName('baz').should('exist')
  })
})

// Workaround for Cypress AE + TS + Vite
// See: https://github.com/quasarframework/quasar-testing/issues/262#issuecomment-1154127497
export {}
