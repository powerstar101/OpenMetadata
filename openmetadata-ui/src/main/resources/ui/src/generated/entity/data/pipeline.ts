/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 *  Copyright 2021 Collate
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *  http://www.apache.org/licenses/LICENSE-2.0
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

/**
 * This schema defines the Pipeline entity. A pipeline enables the flow of data from source
 * to destination through a series of processing steps. ETL is a type of pipeline where the
 * series of steps Extract, Transform and Load the data.
 */
export interface Pipeline {
  /**
   * Change that lead to this version of the entity.
   */
  changeDescription?: ChangeDescription;
  /**
   * Concurrency of the Pipeline.
   */
  concurrency?: number;
  /**
   * When `true` indicates the entity has been soft deleted.
   */
  deleted?: boolean;
  /**
   * Description of this Pipeline.
   */
  description?: string;
  /**
   * Display Name that identifies this Pipeline. It could be title or label from the source
   * services.
   */
  displayName?: string;
  /**
   * Followers of this Pipeline.
   */
  followers?: EntityReference[];
  /**
   * A unique name that identifies a pipeline in the format 'ServiceName.PipelineName'.
   */
  fullyQualifiedName?: string;
  /**
   * Link to the resource corresponding to this entity.
   */
  href?: string;
  /**
   * Unique identifier that identifies a pipeline instance.
   */
  id: string;
  /**
   * Name that identifies this pipeline instance uniquely.
   */
  name: string;
  /**
   * Owner of this pipeline.
   */
  owner?: EntityReference;
  /**
   * Pipeline Code Location.
   */
  pipelineLocation?: string;
  /**
   * Series of pipeline executions and its status.
   */
  pipelineStatus?: PipelineStatus[];
  /**
   * Pipeline  URL to visit/manage. This URL points to respective pipeline service UI.
   */
  pipelineUrl?: string;
  /**
   * Link to service where this pipeline is hosted in.
   */
  service: EntityReference;
  /**
   * Service type where this pipeline is hosted in.
   */
  serviceType?: PipelineServiceType;
  /**
   * Start date of the workflow.
   */
  startDate?: Date;
  /**
   * Tags for this Pipeline.
   */
  tags?: TagLabel[];
  /**
   * All the tasks that are part of pipeline.
   */
  tasks?: Task[];
  /**
   * Last update time corresponding to the new version of the entity in Unix epoch time
   * milliseconds.
   */
  updatedAt?: number;
  /**
   * User who made the update.
   */
  updatedBy?: string;
  /**
   * Metadata version of the entity.
   */
  version?: number;
}

/**
 * Change that lead to this version of the entity.
 *
 * Description of the change.
 */
export interface ChangeDescription {
  /**
   * Names of fields added during the version changes.
   */
  fieldsAdded?: FieldChange[];
  /**
   * Fields deleted during the version changes with old value before deleted.
   */
  fieldsDeleted?: FieldChange[];
  /**
   * Fields modified during the version changes with old and new values.
   */
  fieldsUpdated?: FieldChange[];
  /**
   * When a change did not result in change, this could be same as the current version.
   */
  previousVersion?: number;
}

export interface FieldChange {
  /**
   * Name of the entity field that changed.
   */
  name?: string;
  /**
   * New value of the field. Note that this is a JSON string and use the corresponding field
   * type to deserialize it.
   */
  newValue?: any;
  /**
   * Previous value of the field. Note that this is a JSON string and use the corresponding
   * field type to deserialize it.
   */
  oldValue?: any;
}

/**
 * Followers of this Pipeline.
 *
 * This schema defines the EntityReference type used for referencing an entity.
 * EntityReference is used for capturing relationships from one entity to another. For
 * example, a table has an attribute called database of type EntityReference that captures
 * the relationship of a table `belongs to a` database.
 *
 * Owner of this pipeline.
 *
 * Link to service where this pipeline is hosted in.
 */
export interface EntityReference {
  /**
   * If true the entity referred to has been soft-deleted.
   */
  deleted?: boolean;
  /**
   * Optional description of entity.
   */
  description?: string;
  /**
   * Display Name that identifies this entity.
   */
  displayName?: string;
  /**
   * Fully qualified name of the entity instance. For entities such as tables, databases
   * fullyQualifiedName is returned in this field. For entities that don't have name hierarchy
   * such as `user` and `team` this will be same as the `name` field.
   */
  fullyQualifiedName?: string;
  /**
   * Link to the entity resource.
   */
  href?: string;
  /**
   * Unique identifier that identifies an entity instance.
   */
  id: string;
  /**
   * Name of the entity instance.
   */
  name?: string;
  /**
   * Entity type/class name - Examples: `database`, `table`, `metrics`, `databaseService`,
   * `dashboardService`...
   */
  type: string;
}

/**
 * Series of pipeline executions, its status and task status.
 */
export interface PipelineStatus {
  /**
   * Date where the job was executed.
   */
  executionDate?: number;
  /**
   * Status at a specific execution date.
   */
  executionStatus?: StatusType;
  /**
   * Series of task executions and its status.
   */
  taskStatus?: TaskStatus[];
}

/**
 * Status at a specific execution date.
 *
 * Enum defining the possible Status.
 */
export enum StatusType {
  Failed = 'Failed',
  Pending = 'Pending',
  Successful = 'Successful',
}

/**
 * This schema defines a time series of the status of a Pipeline or Task.
 */
export interface TaskStatus {
  /**
   * Status at a specific execution date.
   */
  executionStatus?: StatusType;
  /**
   * Name of the Task.
   */
  name?: string;
}

/**
 * Service type where this pipeline is hosted in.
 *
 * Type of pipeline service - Airflow or Prefect.
 */
export enum PipelineServiceType {
  Airflow = 'Airflow',
  Generic = 'Generic',
  Glue = 'Glue',
  Prefect = 'Prefect',
}

/**
 * This schema defines the type for labeling an entity with a Tag.
 */
export interface TagLabel {
  /**
   * Unique name of the tag category.
   */
  description?: string;
  /**
   * Link to the tag resource.
   */
  href?: string;
  /**
   * Label type describes how a tag label was applied. 'Manual' indicates the tag label was
   * applied by a person. 'Derived' indicates a tag label was derived using the associated tag
   * relationship (see TagCategory.json for more details). 'Propagated` indicates a tag label
   * was propagated from upstream based on lineage. 'Automated' is used when a tool was used
   * to determine the tag label.
   */
  labelType: LabelType;
  /**
   * Label is from Tags or Glossary.
   */
  source: Source;
  /**
   * 'Suggested' state is used when a tag label is suggested by users or tools. Owner of the
   * entity must confirm the suggested labels before it is marked as 'Confirmed'.
   */
  state: State;
  tagFQN: string;
}

/**
 * Label type describes how a tag label was applied. 'Manual' indicates the tag label was
 * applied by a person. 'Derived' indicates a tag label was derived using the associated tag
 * relationship (see TagCategory.json for more details). 'Propagated` indicates a tag label
 * was propagated from upstream based on lineage. 'Automated' is used when a tool was used
 * to determine the tag label.
 */
export enum LabelType {
  Automated = 'Automated',
  Derived = 'Derived',
  Manual = 'Manual',
  Propagated = 'Propagated',
}

/**
 * Label is from Tags or Glossary.
 */
export enum Source {
  Glossary = 'Glossary',
  Tag = 'Tag',
}

/**
 * 'Suggested' state is used when a tag label is suggested by users or tools. Owner of the
 * entity must confirm the suggested labels before it is marked as 'Confirmed'.
 */
export enum State {
  Confirmed = 'Confirmed',
  Suggested = 'Suggested',
}

export interface Task {
  /**
   * Description of this Task.
   */
  description?: string;
  /**
   * Display Name that identifies this Task. It could be title or label from the pipeline
   * services.
   */
  displayName?: string;
  /**
   * All the tasks that are downstream of this task.
   */
  downstreamTasks?: string[];
  /**
   * end date for the task.
   */
  endDate?: string;
  /**
   * A unique name that identifies a pipeline in the format
   * 'ServiceName.PipelineName.TaskName'.
   */
  fullyQualifiedName?: string;
  /**
   * Name that identifies this task instance uniquely.
   */
  name: string;
  /**
   * start date for the task.
   */
  startDate?: string;
  /**
   * Tags for this task.
   */
  tags?: TagLabel[];
  /**
   * SQL used in the task. Can be used to determine the lineage.
   */
  taskSQL?: string;
  /**
   * Type of the Task. Usually refers to the class it implements.
   */
  taskType?: string;
  /**
   * Task URL to visit/manage. This URL points to respective pipeline service UI.
   */
  taskUrl?: string;
}
