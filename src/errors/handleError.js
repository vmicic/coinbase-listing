const { errorResponseFromAxios } = require('./axiosErrors');

const getErrorResponse = (error) => {
  if (error.isAxiosError === true) {
    return errorResponseFromAxios(error);
  }

  if (error.statusCode !== undefined) {
    return {
      statusCode: error.statusCode,
      body: error.message,
      headers: { 'Content-type': 'text/plain' },
    };
  }
  return {
    statusCode: 500,
    body: 'Unexpected error happened. Please try again.',
    headers: {
      'Content-type': 'text/plain',
    },
  };
};

module.exports = {
  getErrorResponse,
};
