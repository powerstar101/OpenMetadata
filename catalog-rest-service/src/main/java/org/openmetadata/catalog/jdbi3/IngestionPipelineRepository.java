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

package org.openmetadata.catalog.jdbi3;

import static org.openmetadata.catalog.Entity.FIELD_OWNER;

import com.fasterxml.jackson.core.JsonProcessingException;
import java.io.IOException;
import org.json.JSONObject;
import org.openmetadata.catalog.Entity;
import org.openmetadata.catalog.entity.services.ingestionPipelines.AirflowConfig;
import org.openmetadata.catalog.entity.services.ingestionPipelines.IngestionPipeline;
import org.openmetadata.catalog.entity.services.ingestionPipelines.Source;
import org.openmetadata.catalog.metadataIngestion.LogLevels;
import org.openmetadata.catalog.resources.services.ingestionpipelines.IngestionPipelineResource;
import org.openmetadata.catalog.services.connections.metadata.OpenMetadataServerConnection;
import org.openmetadata.catalog.type.EntityReference;
import org.openmetadata.catalog.type.Relationship;
import org.openmetadata.catalog.util.EntityUtil.Fields;
import org.openmetadata.catalog.util.FullyQualifiedName;
import org.openmetadata.catalog.util.JsonUtils;
import org.openmetadata.catalog.util.PipelineServiceClient;

public class IngestionPipelineRepository extends EntityRepository<IngestionPipeline> {
  private static final String INGESTION_PIPELINE_UPDATE_FIELDS = "owner,source,airflowConfig,loggerLevel";
  private static final String INGESTION_PIPELINE_PATCH_FIELDS = "owner,source,airflowConfig,loggerLevel";
  private static PipelineServiceClient pipelineServiceClient;

  public IngestionPipelineRepository(CollectionDAO dao) {
    super(
        IngestionPipelineResource.COLLECTION_PATH,
        Entity.INGESTION_PIPELINE,
        IngestionPipeline.class,
        dao.ingestionPipelineDAO(),
        dao,
        INGESTION_PIPELINE_PATCH_FIELDS,
        INGESTION_PIPELINE_UPDATE_FIELDS);
    this.allowEdits = true;
  }

  @Override
  public void setFullyQualifiedName(IngestionPipeline ingestionPipeline) {
    ingestionPipeline.setFullyQualifiedName(
        FullyQualifiedName.add(ingestionPipeline.getService().getName(), ingestionPipeline.getName()));
  }

  @Override
  public IngestionPipeline setFields(IngestionPipeline ingestionPipeline, Fields fields) throws IOException {
    ingestionPipeline.setService(getService(ingestionPipeline));
    ingestionPipeline.setOwner(fields.contains(FIELD_OWNER) ? getOwner(ingestionPipeline) : null);
    return ingestionPipeline;
  }

  @Override
  public void prepare(IngestionPipeline ingestionPipeline) throws IOException {
    EntityReference entityReference = Entity.getEntityReference(ingestionPipeline.getService());
    ingestionPipeline.setService(entityReference);
    setFullyQualifiedName(ingestionPipeline);
    ingestionPipeline.setOwner(Entity.getEntityReference(ingestionPipeline.getOwner()));
  }

  @Override
  public void storeEntity(IngestionPipeline ingestionPipeline, boolean update) throws IOException {
    // Relationships and fields such as href are derived and not stored as part of json
    EntityReference owner = ingestionPipeline.getOwner();
    EntityReference service = ingestionPipeline.getService();

    // Don't store owner. Build it on the fly based on relationships
    ingestionPipeline.withOwner(null).withService(null).withHref(null);

    store(ingestionPipeline.getId(), ingestionPipeline, update);

    // Restore the relationships
    ingestionPipeline.withOwner(owner).withService(service);
  }

  @Override
  public void storeRelationships(IngestionPipeline ingestionPipeline) {
    EntityReference service = ingestionPipeline.getService();
    addRelationship(
        service.getId(),
        ingestionPipeline.getId(),
        service.getType(),
        Entity.INGESTION_PIPELINE,
        Relationship.CONTAINS);
    storeOwner(ingestionPipeline, ingestionPipeline.getOwner());
    applyTags(ingestionPipeline);
  }

  @Override
  public EntityUpdater getUpdater(IngestionPipeline original, IngestionPipeline updated, Operation operation) {
    return new IngestionPipelineUpdater(original, updated, operation);
  }

  private EntityReference getService(IngestionPipeline ingestionPipeline) throws IOException {
    return getContainer(ingestionPipeline.getId(), Entity.INGESTION_PIPELINE);
  }

  @Override
  protected void postUpdate(IngestionPipeline entity) {
    deploy(entity); // Deploy the ingestion pipeline
  }

  @Override
  protected void postCreate(IngestionPipeline entity) {
    deploy(entity); // Deploy the ingestion pipeline
  }

  @Override
  protected void postDelete(IngestionPipeline entity) {
    pipelineServiceClient.deletePipeline(entity.getName());
  }

  public void setPipelineServiceClient(PipelineServiceClient client) {
    pipelineServiceClient = client;
  }

  private void deploy(IngestionPipeline ingestionPipeline) {
    if (Boolean.TRUE.equals(ingestionPipeline.getAirflowConfig().getForceDeploy())) {
      pipelineServiceClient.deployPipeline(ingestionPipeline);
    }
  }

  /** Handles entity updated from PUT and POST operation. */
  public class IngestionPipelineUpdater extends EntityUpdater {
    public IngestionPipelineUpdater(IngestionPipeline original, IngestionPipeline updated, Operation operation) {
      super(original, updated, operation);
    }

    @Override
    public void entitySpecificUpdate() throws IOException {
      updateSource(original.getSource(), updated.getSource());
      updateAirflowConfig(original.getAirflowConfig(), updated.getAirflowConfig());
      updateOpenMetadataServerConnection(
          original.getOpenMetadataServerConnection(), updated.getOpenMetadataServerConnection());
      updateLogLevel(original.getLoggerLevel(), updated.getLoggerLevel());
    }

    private void updateSource(Source origSource, Source updatedSource) throws JsonProcessingException {
      JSONObject origSourceConfig = new JSONObject(JsonUtils.pojoToJson(origSource.getSourceConfig().getConfig()));
      JSONObject updatedSourceConfig =
          new JSONObject(JsonUtils.pojoToJson(updatedSource.getSourceConfig().getConfig()));
      JSONObject origSourceConnection = new JSONObject(JsonUtils.pojoToJson(origSource.getServiceConnection()));
      JSONObject updatedSourceConnection = new JSONObject(JsonUtils.pojoToJson(updatedSource.getServiceConnection()));

      if (!origSource.getServiceName().equals(updatedSource.getServiceName())
          || !origSourceConfig.similar(updatedSourceConfig)
          || !origSourceConnection.similar(updatedSourceConnection)) {
        recordChange("source", origSource, updatedSource);
      }
    }

    private void updateAirflowConfig(AirflowConfig origAirflowConfig, AirflowConfig updatedAirflowConfig)
        throws JsonProcessingException {
      if (!origAirflowConfig.equals(updatedAirflowConfig)) {
        recordChange("airflowConfig", origAirflowConfig, updatedAirflowConfig);
      }
    }

    private void updateOpenMetadataServerConnection(
        OpenMetadataServerConnection origConfig, OpenMetadataServerConnection updatedConfig)
        throws JsonProcessingException {
      if (updatedConfig != null && !origConfig.equals(updatedConfig)) {
        recordChange("openMetadataServerConnection", origConfig, updatedConfig);
      }
    }

    private void updateLogLevel(LogLevels origLevel, LogLevels updatedLevel) throws JsonProcessingException {
      if (updatedLevel != null && !origLevel.equals(updatedLevel)) {
        recordChange("loggerLevel", origLevel, updatedLevel);
      }
    }
  }
}
