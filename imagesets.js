function importAll(requireModule, pathToImage) {
  return requireModule.keys().map((item, index) => item.replace('./', pathToImage));
}

// The paths have to be written out because invocation of require.context needs to be statically analyzable
export const ERROR_IMAGE_SET = importAll(
    require.context('./public/imagesets/errored', false, /\.(gif|webp|png|jpe?g|svg)$/),
    'imagesets/errored/'
);

export const HAVE_STREAM_IMAGE_SET = importAll(
    require.context('./public/imagesets/have-stream', false, /\.(gif|webp|png|jpe?g|svg)$/),
    'imagesets/have-stream/'
);

export const NO_STREAM_IMAGE_SET = importAll(
    require.context('./public/imagesets/no-stream', false, /\.(gif|webp|png|jpe?g|svg)$/),
    'imagesets/no-stream/'
);
