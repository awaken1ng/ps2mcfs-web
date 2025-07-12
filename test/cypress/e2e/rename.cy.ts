import app from '../support/app'

describe('Rename', () =>{
  beforeEach(() => {
    cy.visit('/')
    cy.contains('No card loaded').should('exist')
  })

  it('renames directory', () => {
    app.newCard()

    app.mkdir('foo')
    app.renameEntryFromMenu('foo', 'bar')
    app.expectEntryMenuToBeClosed()

    app.entryMenu('bar')
    cy.dataCy('entry-menu-rename').click()
    cy.withinDialog(() => {
      cy.focused().should('have.value', 'bar')
      cy.get('button').contains('Cancel').click()
    })
    app.expectEntryMenuToBeClosed()

    // open menu on one item, reposition it on the other, rename the other item
    app.mkdir('foo')

    app.entryMenu('foo')
    app.renameEntryFromMenu('bar', 'baz')

    app.entryMenu('baz')
    cy.dataCy('entry-menu-rename').click()
    cy.withinDialog(() => {
      cy.focused().should('have.value', 'baz')
      cy.get('button').contains('Cancel').click()
    })
    app.expectEntryMenuToBeClosed()
  })
})

// Workaround for Cypress AE + TS + Vite
// See: https://github.com/quasarframework/quasar-testing/issues/262#issuecomment-1154127497
export {}
