include ../../.env

default: build

all: test

test: build
	cargo test

build:
	stellar contract build
	@ls -l ../../target/wasm32-unknown-unknown/release/*.wasm


deploy: build
	stellar contract deploy --source $(SOURCE_ACCOUNT) --network $(STELLAR_NETWORK) --wasm ../../target/wasm32-unknown-unknown/release/$(CONTRACT_ALIAS).wasm --alias $(CONTRACT_ALIAS)

initialize: deploy
	stellar contract invoke --source $(SOURCE_ACCOUNT) --network $(STELLAR_NETWORK) --id $(CONTRACT_ALIAS) -- initialize --admin $(SOURCE_ACCOUNT)

fmt:
	cargo fmt --all

clean:
	cargo clean
