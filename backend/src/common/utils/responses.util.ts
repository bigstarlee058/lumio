/**
 * Standard response for successful delete operations.
 */
export const deletedResponse = (entityName: string) => ({
  message: `${entityName} deleted successfully`,
});
