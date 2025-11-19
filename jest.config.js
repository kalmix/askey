export default {
	preset: 'ts-jest',
	testEnvironment: 'jsdom',
	moduleFileExtensions: ['js', 'ts', 'svelte'],
	transform: {
		'^.+\\.svelte$': [
			'svelte-jester',
			{
				preprocess: true
			}
		],
		'^.+\\.ts$': 'ts-jest',
		'^.+\\.js$': 'babel-jest'
	},
	transformIgnorePatterns: [
		'node_modules/(?!(@testing-library/svelte)/)'
	],
	moduleNameMapper: {
		'^\\$lib(.*)$': '<rootDir>/src/lib$1',
		'^\\$app(.*)$': '<rootDir>/src/app.d.ts',
		'\\.(css|less|scss|sass)$': 'identity-obj-proxy'
	},
	testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.js'],
	collectCoverageFrom: [
		'src/**/*.{ts,svelte}',
		'!src/**/*.d.ts',
		'!src/app.html',
		'!src/service-worker.ts'
	],
	setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
	testPathIgnorePatterns: ['/node_modules/', '/.svelte-kit/']
};
