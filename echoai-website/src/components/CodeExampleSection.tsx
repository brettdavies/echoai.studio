import React from 'react';

const CodeExampleSection = () => {
  return (
    <section className="py-16 bg-black">
      <div className="container mx-auto px-4 text-center">
        <div className="mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Exceptionally rapid support on all channels
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Experience lightning-fast transcription with our state-of-the-art platform that processes audio in real-time.
          </p>
        </div>

        <div className="max-w-4xl mx-auto border-2 border-orange-500 rounded-lg overflow-hidden bg-black p-1">
          <div className="bg-gray-900 rounded-lg text-left p-6">
            <div className="flex gap-2 pb-4 mb-4 border-b border-gray-800">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
            </div>
            <pre className="text-white overflow-x-auto font-mono text-sm">
              <code>
{`// Initialize echoAI transcription
const echo = new EchoAI.Transcription({
  apiKey: process.env.ECHO_API_KEY,
  options: {
    language: 'en-US',
    latency: 'ultra-low',
  }
});

// Start listening to audio stream
echo.listen(audioStream);

// Real-time transcription events
echo.on('transcription', (result) => {
  console.log('Live transcription:', result.text);
});`}
              </code>
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CodeExampleSection; 