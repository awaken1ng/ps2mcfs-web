import app from '../support/app'

describe('Path', () => {
  beforeEach(() => {
    cy.visit('/')
    cy.contains('No card loaded').should('exist')
  })

  it('navigates correctly', () => {
    app.openCardFromFixtures('cards/foo-bar-baz.mcd')

    // entry up
    app.entry('foo').click()
    app.entryByName('aaa-empty').should('exist')
    cy.dataCy('entry-up').click() // go back
    app.entryByName('foo').should('exist')

    // breadcrumbs root
    app.entry('bar').click()
    app.entryByName('aaa-unaligned').should('exist')
    cy.dataCy('breadcrumbs-root').click()
    app.entryByName('bar').should('exist')

    // going back
    app.entry('baz').click()
    app.entryByName('aaa-aligned').should('exist')
    cy.go('back')
    app.entryByName('baz').should('exist')

    // router
    cy.visit('#/foo')
    app.entryByName('aaa-empty').should('exist')
    cy.visit('#/')
    app.entryByName('foo').should('exist')
  })
})

// Workaround for Cypress AE + TS + Vite
// See: https://github.com/quasarframework/quasar-testing/issues/262#issuecomment-1154127497
export {}
