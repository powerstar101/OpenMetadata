#  Copyright 2021 Collate
#  Licensed under the Apache License, Version 2.0 (the "License");
#  you may not use this file except in compliance with the License.
#  You may obtain a copy of the License at
#  http://www.apache.org/licenses/LICENSE-2.0
#  Unless required by applicable law or agreed to in writing, software
#  distributed under the License is distributed on an "AS IS" BASIS,
#  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
#  See the License for the specific language governing permissions and
#  limitations under the License.
"""
Snowflake usage module
"""

import traceback
from datetime import timedelta
from typing import Any, Dict, Iterable, Iterator, Union

from sqlalchemy import inspect

from metadata.generated.schema.entity.services.connections.database.snowflakeConnection import (
    SnowflakeConnection,
)
from metadata.generated.schema.entity.services.connections.metadata.openMetadataConnection import (
    OpenMetadataConnection,
)
from metadata.generated.schema.entity.services.databaseService import (
    DatabaseServiceType,
)
from metadata.generated.schema.metadataIngestion.workflow import (
    Source as WorkflowSource,
)
from metadata.generated.schema.metadataIngestion.workflow import WorkflowConfig
from metadata.ingestion.api.source import InvalidSourceException

# This import verifies that the dependencies are available.
from metadata.ingestion.models.table_queries import TableQuery
from metadata.ingestion.source.usage_source import UsageSource
from metadata.utils.connections import get_connection
from metadata.utils.helpers import get_start_and_end
from metadata.utils.logger import ingestion_logger
from metadata.utils.sql_queries import SNOWFLAKE_SQL_STATEMENT

logger = ingestion_logger()


class SnowflakeUsageSource(UsageSource):
    # SELECT statement from mysql information_schema
    # to extract table and column metadata
    SQL_STATEMENT = SNOWFLAKE_SQL_STATEMENT

    # CONFIG KEYS
    WHERE_CLAUSE_SUFFIX_KEY = "where_clause"
    CLUSTER_SOURCE = "cluster_source"
    CLUSTER_KEY = "cluster_key"
    USE_CATALOG_AS_CLUSTER_NAME = "use_catalog_as_cluster_name"
    DATABASE_KEY = "database_key"
    SERVICE_TYPE = DatabaseServiceType.Snowflake.value
    DEFAULT_CLUSTER_SOURCE = "CURRENT_DATABASE()"

    def __init__(self, config: WorkflowSource, metadata_config: OpenMetadataConnection):
        super().__init__(config, metadata_config)
        start, end = get_start_and_end(self.config.sourceConfig.config.queryLogDuration)
        end = end + timedelta(days=1)
        self.analysis_date = start
        self.sql_stmt = SnowflakeUsageSource.SQL_STATEMENT.format(
            start_date=start,
            end_date=end,
            result_limit=self.config.sourceConfig.config.resultLimit,
        )
        self._extract_iter: Union[None, Iterator] = None
        self._database = "Snowflake"

    @classmethod
    def create(cls, config_dict, metadata_config: WorkflowConfig):
        config: WorkflowSource = WorkflowSource.parse_obj(config_dict)
        connection: SnowflakeConnection = config.serviceConnection.__root__.config
        if not isinstance(connection, SnowflakeConnection):
            raise InvalidSourceException(
                f"Expected SnowflakeConnection, but got {connection}"
            )
        return cls(config, metadata_config)

    def _get_raw_extract_iter(self) -> Iterable[Dict[str, Any]]:
        if self.config.serviceConnection.__root__.config.database:
            yield from super(SnowflakeUsageSource, self)._get_raw_extract_iter()
        else:
            query = "SHOW DATABASES"
            results = self.engine.execute(query)
            for res in results:
                row = list(res)
                use_db_query = f"USE DATABASE {row[1]}"
                self.engine.execute(use_db_query)
                logger.info(f"Ingesting from database: {row[1]}")
                self.config.serviceConnection.__root__.config.database = row[1]
                self.engine = get_connection(self.connection)
                rows = self.engine.execute(self.sql_stmt)
                for row in rows:
                    yield row

    def next_record(self) -> Iterable[TableQuery]:
        """
        Using itertools.groupby and raw level iterator,
        it groups to table and yields TableMetadata
        :return:
        """
        for row in self._get_raw_extract_iter():
            try:
                table_query = TableQuery(
                    query=row["query_type"],
                    user_name=row["user_name"],
                    starttime=str(row["start_time"]),
                    endtime=str(row["end_time"]),
                    analysis_date=self.analysis_date,
                    aborted="1969" in str(row["end_time"]),
                    database=row["database_name"],
                    sql=row["query_text"],
                    service_name=self.config.serviceName,
                )
                if not row["database_name"] and self.connection.database:
                    TableQuery.database = self.connection.database
                logger.debug(f"Parsed Query: {row['query_text']}")
                if row["schema_name"] is not None:
                    self.report.scanned(f"{row['database_name']}.{row['schema_name']}")
                else:
                    self.report.scanned(f"{row['database_name']}")
                yield table_query
            except Exception as err:
                logger.debug(traceback.format_exc())
                logger.debug(repr(err))
