import app from '../support/app'

describe('Path', () => {
  beforeEach(() => {
    cy.visit('/')
    cy.contains('No card loaded').should('exist')
    app.newCard()
    app.mkdir('foo')
    app.entry('foo').click()
    app.mkdir('bar', true)
    app.entry('bar').click()
    app.mkdir('baz', true)
    app.entry('baz').click()
    cy.contains('No items')
  })

  it('navigates with entry up', () => {
    cy.dataCy('entry-up').click()
    app.entryByName('baz').should('exist')
    cy.dataCy('entry-up').click()
    app.entryByName('bar').should('exist')
    cy.dataCy('entry-up').click()
    app.entryByName('foo').should('exist')
  })

  it('navigates with breadcrumbs', () => {
    cy.dataCy('breadcrumbs-crumb').contains('bar').click()
    app.entryByName('baz').should('exist')
    cy.dataCy('breadcrumbs-crumb').contains('foo').click()
    app.entryByName('bar').should('exist')
    cy.dataCy('breadcrumbs-root').click()
    app.entryByName('foo').should('exist')
  })

  it('navigates with back button', () => {
    cy.go('back')
    app.entryByName('baz').should('exist')
    cy.go('back')
    app.entryByName('bar').should('exist')
    cy.go('back')
    app.entryByName('foo').should('exist')
  })

  it('navigates with router', () => {
    cy.visit('#/foo/bar')
    app.entryByName('baz').should('exist')
    cy.visit('#/foo')
    app.entryByName('bar').should('exist')
    cy.visit('#/')
    app.entryByName('foo').should('exist')
  })
})

// Workaround for Cypress AE + TS + Vite
// See: https://github.com/quasarframework/quasar-testing/issues/262#issuecomment-1154127497
export {}
