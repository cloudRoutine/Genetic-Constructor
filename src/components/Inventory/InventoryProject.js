import React, { Component, PropTypes } from 'react';
import { connect } from 'react-redux';
import Project from '../../models/Project';
import { projectGet, projectListAllBlocks } from '../../selectors/projects';
import { projectList, projectLoad, projectSave, projectOpen } from '../../actions/projects';
import { focusForceProject } from '../../actions/focus';
import { inspectorToggleVisibility } from '../../actions/ui';

import InventoryConstruct from './InventoryConstruct';
import InventoryListGroup from './InventoryListGroup';

//this component expects the project to be available in the store, but not necessarily its components. It handles loading the project's components and adding them to the store.

export class InventoryProject extends Component {
  static propTypes = {
    project: (props, propName) => {
      if (!(Project.validate(props[propName]) && props[propName] instanceof Project)) {
        return new Error('must pass a project (Project model) to InventoryProject');
      }
    },
    isActive: PropTypes.bool.isRequired,
    projectLoad: PropTypes.func.isRequired,
    projectGet: PropTypes.func.isRequired,
    projectSave: PropTypes.func.isRequired,
    projectOpen: PropTypes.func.isRequired,
    focusForceProject: PropTypes.func.isRequired,
    inspectorToggleVisibility: PropTypes.func.isRequired,
  };

  state = {
    isLoading: false,
    isExpanded: false,
    errorLoading: false,
  };

  //handle double-click to open
  onToggleProject = (nextState, projectId) => {
    const { isActive } = this.props;

    //this ensures the project is in the store
    this.handleToggleProject(nextState, projectId)
      .then(() => {
        if (isActive) {
          //inspect it
          this.inspectProject(projectId);
        } else {
          this.props.projectOpen(projectId);
        }
      });
  };

  //only call after project has been loaded and is in the store
  inspectProject = (projectId) => {
    const project = this.props.projectGet(projectId);
    this.props.focusForceProject(project);
    this.props.inspectorToggleVisibility(true);
  };

  loadProject = (projectId) => {
    //for now, just load the whole project and stick it in the store
    //need to ensure things like blockClone will work on drag. Simplifies browsing of project.
    //could delegate loading of construct components to InventoryConstruct, and load only one level deep
    return this.props.projectLoad(projectId);
  };

  handleToggleProject = (nextState, projectId) => {
    if (!!nextState) {
      this.setState({ isLoading: true });

      return this.loadProject(projectId)
        .then(() => this.setState({
          isLoading: false,
          isExpanded: true,
        }))
        .catch(() => this.setState({
          isLoading: false,
          isExpanded: false,
          errorLoading: true,
        }));
    }

    //otherwise, closing
    this.setState({ isExpanded: false });
    return Promise.resolve();
  };

  render() {
    const { project, isActive } = this.props;
    const { isLoading, isExpanded, errorLoading } = this.state;
    const projectId = project.id;
    const canToggle = project.components.length > 0;

    return (
      <InventoryListGroup title={project.getName()}
                          manual
                          canToggle={canToggle && !errorLoading}
                          isLoading={isLoading}
                          isExpanded={isExpanded && canToggle}
                          onToggle={(nextState) => this.handleToggleProject(nextState, projectId)}
                          onSelect={(nextState) => this.onToggleProject(nextState, projectId)}
                          isActive={isActive}
                          dataAttribute={`project ${project.id}`}>
        {project.components.map(compId => {
          return (<InventoryConstruct key={compId}
                                      depth={0}
                                      blockId={compId}/>);
        })}
      </InventoryListGroup>
    );
  }
}

export default connect(() => ({}), {
  projectList,
  projectLoad,
  projectGet,
  projectSave,
  projectListAllBlocks,
  focusForceProject,
  inspectorToggleVisibility,
  projectOpen,
})(InventoryProject);
