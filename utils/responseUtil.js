const errorResponse = (statusCode, body, headers) => ({
  statusCode,
  body,
  headers,
});

const errorResponseFromError = (error) => ({
  statusCode: error.statusCode,
  body: error.message,
  headers: { 'Content-type': 'text/plain' },
});

module.exports = {
  errorResponse,
  errorResponseFromError,
};
