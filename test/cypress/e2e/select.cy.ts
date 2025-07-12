import app from '../support/app'

describe('Select', () => {
  beforeEach(() => {
    cy.visit('/')
    cy.contains('No card loaded').should('exist')
  })

  it('selects and deselects items', () => {
    app.openCardFromFixtures('cards/foo-bar-baz.mcd')

    app.entrySelect('foo')
    app.expectEntryToBeSelected('foo')
    app.expectEntryToBeNotSelected('bar')
    app.expectEntryToBeNotSelected('baz')

    app.entrySelect('bar')
    app.expectEntryToBeSelected('foo')
    app.expectEntryToBeSelected('bar')
    app.expectEntryToBeNotSelected('baz')

    app.entrySelect('baz')
    app.expectEntryToBeSelected('foo')
    app.expectEntryToBeSelected('bar')
    app.expectEntryToBeSelected('baz')

    app.toggleSelection()
    app.expectEntryToBeNotSelected('foo')
    app.expectEntryToBeNotSelected('bar')
    app.expectEntryToBeNotSelected('baz')

    app.toggleSelection()
    app.expectEntryToBeSelected('foo')
    app.expectEntryToBeSelected('bar')
    app.expectEntryToBeSelected('baz')

    app.entrySelect('foo')
    app.expectEntryToBeNotSelected('foo')
    app.expectEntryToBeSelected('bar')
    app.expectEntryToBeSelected('baz')
    app.toggleSelection()
    app.expectEntryToBeSelected('foo')
    app.expectEntryToBeSelected('bar')
    app.expectEntryToBeSelected('baz')
  })
})

// Workaround for Cypress AE + TS + Vite
// See: https://github.com/quasarframework/quasar-testing/issues/262#issuecomment-1154127497
export {}
