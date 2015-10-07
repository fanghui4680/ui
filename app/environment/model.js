import Resource from 'ember-api-store/models/resource';
import UnremovedArrayProxy from 'ui/utils/unremoved-array-proxy';

var Environment = Resource.extend({
  type: 'environment',
  endpoint: Ember.inject.service(),

  actions: {
    activateServices: function() {
      return this.doAction('activateservices');
    },

    deactivateServices: function() {
      return this.doAction('deactivateservices');
    },

    addService: function() {
      this.get('controllers.application').transitionToRoute('service.new', {
        queryParams: {
          environmentId: this.get('id'),
        },
      });
    },

    addBalancer: function() {
      this.get('controllers.application').transitionToRoute('service.new-balancer', {
        queryParams: {
          environmentId: this.get('id'),
        },
      });
    },

    edit: function() {
      this.get('controllers.application').setProperties({
        editEnvironment: true,
        originalModel: this,
      });
    },

    exportConfig: function() {
      var url = this.get('endpoint').addAuthParams(this.linkFor('composeConfig'));
      Util.download(url);
    },

    viewCode: function() {
      this.get('application').transitionToRoute('environment.code', this.get('id'));
    },

    viewGraph: function() {
      this.get('application').transitionToRoute('environment.graph', this.get('id'));
    },

    delete: function() {
      return this._super().then(() => {
        if ( this.get('application.currentRouteName') === 'environment.index' )
        {
          this.get('router').transitionTo('environments');
        }
      });
    },
  },

  availableActions: function() {
    var a = this.get('actionLinks');

    var out = [
      { label: 'Start Services',  icon: 'icon icon-play',             action: 'activateServices',    enabled: this.get('canActivate') },
      { label: 'Stop Services',   icon: 'icon icon-pause',            action: 'deactivateServices',  enabled: this.get('canDeactivate') },
      { label: 'View Graph',      icon: 'icon icon-share',            action: 'viewGraph',            enabled: true },
      { label: 'View Config',     icon: 'icon icon-files',            action: 'viewCode',            enabled: true },
      { label: 'Export Config',   icon: 'icon icon-download',         action: 'exportConfig',        enabled: !!a.exportconfig },
      { divider: true },
      { label: 'Delete',          icon: 'icon icon-trash',            action: 'promptDelete',        enabled: !!a.remove, altAction: 'delete', color: 'text-warning' },
      { label: 'View in API',     icon: 'icon icon-externallink',     action: 'goToApi',             enabled: true },
      { divider: true },
      { label: 'Edit',            icon: 'icon icon-edit',             action: 'edit',                enabled: true },
    ];

    return out;
  }.property('actionLinks.{remove,purge,exportconfig}','canActivate','canDeactivate'),

  healthState: function() {
    // Get the state of each instance
    var services = this.get('services')||[];
    var healthy = 0;
    var unremoved = 0;
    services.forEach((service) => {
      var resource = service.get('state');
      var health = service.get('healthState');

      if ( ['removing','removed','purging','purged'].indexOf(resource) >= 0 )
      {
        return;
      }

      unremoved++;

      if ( ['running','active','updating-active'].indexOf(resource) >= 0 && health === 'healthy' )
      {
        healthy++;
      }
    });

    if ( healthy >= unremoved )
    {
      return 'healthy';
    }
    else
    {
      return 'unhealthy';
    }
  }.property('services.@each.{state,healthState}'),

  combinedState: function() {
    var env = this.get('state');
    var health = this.get('healthState');
    if ( ['active','updating-active'].indexOf(env) === -1 )
    {
      // If the environment isn't active, return its state
      return env;
    }

    if ( health === 'healthy' )
    {
      return env;
    }
    else
    {
      return 'degraded';
    }
  }.property('state', 'healthState'),

  canActivate: function() {
    if ( !this.hasAction('activateservices') )
    {
      return false;
    }

    var count = this.get('services.length') || 0;
    if ( count === 0 )
    {
      return false;
    }

    return this.get('services').filterBy('actionLinks.activate').get('length') > 0;
  }.property('services.@each.state','actionLinks.activateservices'),

  canDeactivate: function() {
    if ( !this.hasAction('deactivateservices') )
    {
      return false;
    }

    var count = this.get('services.length') || 0;
    if ( count === 0 )
    {
      return false;
    }

    return this.get('services').filterBy('actionLinks.deactivate').get('length') > 0;
  }.property('services.@each.state','actionLinks.deactivateservices'),


  unremovedServices: function() {
    return UnremovedArrayProxy.create({sourceContent: this.get('services')});
  }.property('services')
});

Environment.reopenClass({
  stateMap: {
    'active':           {icon: 'icon icon-globe',          color: 'text-success'},
  }
});

export default Environment;
