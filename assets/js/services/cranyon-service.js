/**
 * @overview Manager of Cranyons API access from frontend
 * @module   cranyon-service
 */

'use strict';

/**
 * Cranyon service object for factory call
 */
class CranyonService {

  /**
   * Service constructor
   */
  constructor($window, Restangular) {
    this.activeCranyon;

    this.window      = $window;
    this.picDomain   = this.window.appData.picDomain;
    this.Restangular = Restangular;

    this.cranyonsQueue = [];

    this.loading = true;
    this.visited404 = false;

    this.futureCranyons = new Map();
    this.cranyonHistory = new Map();
  }

  /**
   * Store a reference to a cranyon controller in the cranyonHistory map
   */
  register(id, controller) {
    this.cranyonHistory.set(id, controller);
  }

  /**
   * Remove a reference to a cranyon controller in the cranyonHistory map
   */
  unregister(id) {
    this.cranyonHistory.delete(id);
  }

  /**
   * Add a cranyon object to the queue
   */
  add(cranyon) {
    this.cranyonsQueue.push(cranyon);
  }

  /**
   * Remove a cranyon object from the queue
   */
  remove(id) {
    const index = this.cranyonsQueue.findIndex((element) => element.id === id)
    this.cranyonsQueue.splice(index, 1);
  }

  /**
   * Remove a cranyon object from the queue and unregister it from the history
   */
  forget(cranyonID) {
    // remove cranyon from queue
    this.remove(cranyonID);
    // unregister
    this.unregister(cranyonID);
  }

  /**
   * Get a particular Cranyon doc from DB and then get the Cranyon docs associated with all of its clickables
   */
  fetch(id) {
    return this.Restangular.one('cranyons', id).get()
      .then((cranyon) => {
        // add cranyon data to queue. has side effect of adding new cranyon to view
        this.add(cranyon);
        return this.fetchChildren(cranyon)
      });
  }

  fetchChildren(cranyon) {
    const clickablesMeta = new Map();
    let tasks = cranyon.clickables.map(clickable => {
      // @todo: cache layer => before hitting API, check if the clickable.id already exists in the map, if so don't bother hitting API!
      return this.Restangular.one('cranyons', clickable.id).get()
        .then((futureCran) => {
          clickablesMeta.set(futureCran.id, futureCran);
        });
    })
    return Promise.all(tasks)
      .then(() => {
        this.futureCranyons.set(cranyon.id, clickablesMeta);
      });
  }

  documentActiveCranyon(id) {
    this.activeCranyon = id;
  }

  hasAlreadySeenThis(id) {
    return !!this.cranyonHistory.get(id);
  }

  clickableClicked(clickableID, currentCranyon) {
    const cranyonUpNext = this.futureCranyons.get(currentCranyon.id).get(clickableID);

    this.window.history.pushState({id: cranyonUpNext.id}, '', '/' + cranyonUpNext.url);
    // already been to this cranyon
    if (this.hasAlreadySeenThis(cranyonUpNext.id)) {
      const cranyonUpNextCtrl = this.cranyonHistory.get(cranyonUpNext.id);
      cranyonUpNextCtrl.imageLoaded();
    }
    // haven't been to this cranyon yet
    else {
      this.add(cranyonUpNext);
      this.fetchChildren(cranyonUpNext);
    }
  }

  inactivateCurrent() {
    const currentActiveCtrl = this.cranyonHistory.get(this.activeCranyon);
    if (currentActiveCtrl) {
      currentActiveCtrl.setIsActive(false);
    }
  }

  setBackgroundImage(imageSrc) {
    const el = this.window.document.querySelector('.letterbox')
    el.style.backgroundImage = 'url("' + imageSrc + '")';
  }

  backAction(rootscope, id) {
    const currentCranyonCtrl = this.cranyonHistory.get(this.activeCranyon);
    this.activeCranyon = id; 
    this.isLoading(true);
    rootscope.$apply();
    const pastCranyonCtrl = this.cranyonHistory.get(id);
    if (pastCranyonCtrl) {

      this.setBackgroundImage(pastCranyonCtrl.imageSrc);

      currentCranyonCtrl.clearClickables();
      currentCranyonCtrl.setIsActive(false);
      pastCranyonCtrl.setIsActive(true);
      pastCranyonCtrl.setPageTitleToName();
      rootscope.$apply();
      pastCranyonCtrl.init();
      this.isLoading(false);
      rootscope.$apply();
    } else {
      currentCranyonCtrl.clearClickables();
      currentCranyonCtrl.setIsActive(false);
      this.fetch(id);
      rootscope.$apply();
    }
  }

  isLoading(loading) {
    this.loading = loading;
  }
}

/**
 * Specify dependencies to be injected
 */
CranyonService.$inject = ['$window', 'Restangular'];

export default CranyonService;
