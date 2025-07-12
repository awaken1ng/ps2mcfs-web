import app from '../support/app'

describe('Mkdir', () => {
  beforeEach(() => {
    cy.visit('/')
    cy.contains('No card loaded').should('exist')
  })

  it('creates and opens new directory', () => {
    app.newCard()

    const name1 = 'foo'
    const name2 = 'bar'

    app.mkdir(name1)

    // should not allow creating directory with existing name
    cy.dataCy('toolbar-mkdir').click()
    cy.withinDialog(() => {
      cy.focused().type(name1)
      cy.get('button[disabled]').contains('Create')
      cy.get('button').contains('Cancel').click()
    })

    // open the new directory
    app.entry(name1).click()
    cy.contains('No items')
    cy.get('[data-cy="toolbar-mkdir"][disabled]').should('exist')
    cy.dataCy('entry-up').click() // go back
    app.entry(name1).should('exist')

    // submit with enter
    cy.dataCy('toolbar-mkdir').click()
    cy.withinDialog(() => {
      cy.contains('New directory name:')
      cy.focused().type(name2).type('{enter}')
    })
    app.entry(name2).should('exist')

    // close card, should prompt for unsaved changes
    app.closeCard()
    app.expectUnsavedChanges()
    cy.contains('No card loaded').should('exist')
  })
})

// Workaround for Cypress AE + TS + Vite
// See: https://github.com/quasarframework/quasar-testing/issues/262#issuecomment-1154127497
export {}
