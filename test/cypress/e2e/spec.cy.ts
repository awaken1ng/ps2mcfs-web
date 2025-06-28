// Use `cy.dataCy` custom command for more robust tests
// See https://docs.cypress.io/guides/references/best-practices.html#Selecting-Elements

const newCard = () => {
  cy.log('creating new card')
  cy.dataCy('toolbar-new').click()
}

const closeCard = () => {
  cy.log('closing card')
  cy.dataCy('toolbar-close').click()
}

const createNewDirectory = (name: string) => {
  cy.log(`creaing new directory ${name}`)
  cy.dataCy('toolbar-createDirectory').click()
    cy.withinDialog(() => {
      cy.contains('New directory name:')
      cy.focused().type(name)
      cy.get('button').contains('Create').click()
    })

  // ensure the created directory is in the item list
  getEntryName(name).should('exist')
}

const getEntryName = (name: string) => {
  cy.log(`get entry name ${name}`)
  return cy.dataCy('entry-name').contains(name)
}

const getEntry = (name: string) => {
  cy.log(`get entry ${name}`)
  return getEntryName(name).parents('[data-cy=entry]')
}

const expectEntryToBeSelected = (name: string) => {
  cy.log(`entry ${name} should be selected`)
  getEntry(name).should('have.class', 'q-item--active')
}

const expectEntryToBeNotSelected = (name: string) => {
  cy.log(`entry ${name} should not be selected`)
  getEntry(name).should('not.have.class', 'q-item--active')
}

const toggleEntrySelection = (name: string) => {
  cy.log(`toggle entry selection ${name}`)
  getEntry(name).dataCy('entry-icon').click()
}

const openEntryMenu = (name: string) => {
  cy.log(`open entry menu ${name}`)
  getEntry(name).dataCy('entry-menu-open').click()
  expectMenuToBeOpen()
}

const deleteFromMenu = (name: string) => {
  cy.log(`deleting ${name} from menu`)
  openEntryMenu(name)
  cy.dataCy('entry-menu-delete').click()
  cy.withinDialog(() => {
    cy.contains('Delete')
    cy.get('button').contains('OK').click()
  })
}

const renameFromMenu = (name: string, newName: string) => {
  cy.log(`renaming ${name} from menu`)
  openEntryMenu(name)
  cy.dataCy('entry-menu-rename').click()
  cy.withinDialog(() => {
    cy.contains(/Rename directory|Rename file/)
    cy.focused().clear().type(newName)
    cy.get('button').contains('Rename').click()
  })
}

const expectMenuToBeOpen = () => {
  cy.log('menu should be open')
  cy.dataCy('entry-menu').should('exist')
}
const expectMenuToBeClosed = () => {
  cy.log('menu should be closed')
  cy.dataCy('entry-menu').should('not.exist')
}

const expectUnsavedChanges = () => {
  cy.log('should have unsaved changes')
  cy.get('.q-dialog').contains('Unsaved changes')
  cy.get('.q-dialog').contains('OK').click()
}

describe('Main', () => {
  beforeEach(() => {
    cy.visit('/')
    cy.contains('No card loaded').should('exist')
  })

  it('creates and closes new memory card', () => {
    const assertIsNotLoaded = () => {
      cy.get('[data-cy="toolbar-new"]:not([disabled])').should('exist')
      cy.get('[data-cy="toolbar-open"]:not([disabled])').should('exist')
      cy.get('[data-cy="toolbar-saveAs"][disabled]').should('exist')
      cy.get('[data-cy="toolbar-close"][disabled]').should('exist')

      cy.dataCy('file-name').should('not.exist')
      cy.dataCy('file-name-skeleton').should('exist')
      cy.get('[data-cy="toolbar-addFile"][disabled]').should('exist')
      cy.get('[data-cy="toolbar-createDirectory"][disabled]').should('exist')
      cy.get('[data-cy="toolbar-toggleSelect"][disabled]').should('exist')

      cy.dataCy('breadcrumbs-root').should('not.exist')
      cy.dataCy('breadcrumbs-skeleton').should('exist')

      cy.contains('No card loaded')
    }

    const assertIsLoaded = () => {
      cy.get('[data-cy=toolbar-close]:not([disabled])').should('exist')

      cy.dataCy('file-name').should('exist')
      cy.dataCy('file-name-skeleton').should('not.exist')
      cy.get('[data-cy="toolbar-addFile"]:not([disabled])').should('exist')
      cy.get('[data-cy="toolbar-createDirectory"]:not([disabled])').should('exist')
      cy.get('[data-cy="toolbar-toggleSelect"][disabled]').should('exist')

      cy.dataCy('breadcrumbs-root').should('exist')
      cy.dataCy('breadcrumbs-skeleton').should('not.exist')
      cy.contains('No items').should('exist')
    }

    assertIsNotLoaded()
    newCard()
    assertIsLoaded()
    closeCard()
    assertIsNotLoaded()
  })

  it('creates and opens new directory', () => {
    newCard()

    const name = 'foo'

    createNewDirectory(name)

    // should not allow creating directory with existing name
    cy.dataCy('toolbar-createDirectory').click()
    cy.withinDialog(() => {
      cy.focused().type(name)
      cy.get('button[disabled]').contains('Create')
      cy.get('button').contains('Cancel').click()
    })

    // navigate to one of them, and go back
    getEntry(name).click()
    cy.contains('No items')
    cy.dataCy('entry-up').click() // go back
    getEntryName(name).should('exist')

    // close card, should prompt for unsaved changes
    closeCard()
    expectUnsavedChanges()
    cy.contains('No card loaded').should('exist')
  })

  it('deletes directory', () => {
    newCard()

    const name1 = 'foo'
    const name2 = 'bar'
    const name3 = 'baz'

    createNewDirectory(name1)
    createNewDirectory(name2)

    toggleEntrySelection(name1)
    deleteFromMenu(name1)

    getEntryName(name1).should('not.exist')
    getEntryName(name2).should('exist')

    deleteFromMenu(name2)
    cy.contains('No items')
    expectMenuToBeClosed()

    // should delete selected directories
    createNewDirectory(name1)
    createNewDirectory(name2)
    createNewDirectory(name3)
    toggleEntrySelection(name1)
    toggleEntrySelection(name2)
    deleteFromMenu(name1)
    expectMenuToBeClosed()
    getEntryName(name3).should('exist')
  })

  it('renames directory', () => {
    newCard()

    createNewDirectory('foo')
    renameFromMenu('foo', 'bar')
    expectMenuToBeClosed()

    openEntryMenu('bar')
    cy.dataCy('entry-menu-rename').click()
    cy.withinDialog(() => {
      cy.focused().should('have.value', 'bar')
      cy.get('button').contains('Cancel').click()
    })
    expectMenuToBeClosed()

    // open menu on one item, reposition it on the other, rename the other item
    createNewDirectory('foo')

    openEntryMenu('foo')
    renameFromMenu('bar', 'baz')

    openEntryMenu('baz')
    cy.dataCy('entry-menu-rename').click()
    cy.withinDialog(() => {
      cy.focused().should('have.value', 'baz')
      cy.get('button').contains('Cancel').click()
    })
    expectMenuToBeClosed()
  })

  it('opens and closes entry menu', () => {
    newCard()

    const name1 = 'foo'
    const name2 = 'bar'
    const name3 = 'baz'
    createNewDirectory(name1)
    createNewDirectory(name2)

    // should close when clicking on entry
    openEntryMenu(name1)
    getEntry(name1).click()
    expectMenuToBeClosed()

    // should close when toggling selection on entry
    openEntryMenu(name1)
    toggleEntrySelection(name1)
    expectEntryToBeNotSelected(name1)
    expectMenuToBeClosed()

    // should close when clicking on another entry
    openEntryMenu(name1)
    getEntry(name2).click()
    expectMenuToBeClosed()

    // should close when toggling selection on another entry
    openEntryMenu(name1)
    toggleEntrySelection(name2)
    expectEntryToBeNotSelected(name2)
    expectMenuToBeClosed()

    // should deselect entries when opening a non-selected entry
    toggleEntrySelection(name1)
    openEntryMenu(name1)
    expectEntryToBeSelected(name1)
    openEntryMenu(name2)
    expectEntryToBeNotSelected(name1)
    getEntry(name2).click()

    // right click should open menu
    getEntry(name1).rightclick()
    expectMenuToBeOpen()
    getEntry(name1).click()
    expectMenuToBeClosed()

    // should update position when menu is already open
    openEntryMenu(name1)
    openEntryMenu(name2)
    getEntry(name1).rightclick()
    expectMenuToBeOpen()
    getEntry(name2).rightclick()
    expectMenuToBeOpen()
    getEntry(name2).click()
    expectMenuToBeClosed()

    // esc should close the menu
    openEntryMenu(name1)
    cy.dataCy('entry-menu').type('{esc}')
    expectMenuToBeClosed()

    // clicking outside should close the menu
    openEntryMenu(name1)
    cy.dataCy('file-name').click()
    expectMenuToBeClosed()

    // when already open, trying to open again closes the menu
    openEntryMenu(name1)
    getEntry(name1).dataCy('entry-menu-open').click()
    expectMenuToBeClosed()

    // should close when clicking on free space indicator in root directory
    openEntryMenu(name1)
    cy.dataCy('entry-up').click()
    expectMenuToBeClosed()

    // should close when going up
    getEntry(name1).click()
    createNewDirectory(name3)
    openEntryMenu(name3)
    getEntry(name3).should('exist')
    cy.dataCy('entry-up').click()
    expectMenuToBeClosed()
  })
})

// Workaround for Cypress AE + TS + Vite
// See: https://github.com/quasarframework/quasar-testing/issues/262#issuecomment-1154127497
export {}

