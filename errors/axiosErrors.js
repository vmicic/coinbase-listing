const errorResponseFromAxios = (error) => ({
  statusCode: error.response.status,
  body: JSON.stringify(error.response.data),
  headers: { 'Content-type': 'application/json' },
});

module.exports = {
  errorResponseFromAxios,
};
