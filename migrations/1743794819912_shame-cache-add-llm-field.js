/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
exports.shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.up = (pgm) => {
  // Add the llm_model column
  pgm.addColumn("shame_cache", {
    llm_model: {
      type: "varchar(100)",
      notNull: false,
    },
  });

  // Update existing records to set the default value
  pgm.sql(
    `UPDATE shame_cache SET llm_model = 'gpt-3.5-turbo' WHERE llm_model IS NULL`
  );

  // Make the column not null after updating existing records
  pgm.alterColumn("shame_cache", "llm_model", {
    notNull: true,
    default: "gpt-3.5-turbo",
  });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  pgm.dropColumn("shame_cache", "llm_model");
};
