use aiken/builtin.{bytearray_to_integer, mod_integer}
use aiken/cbor
use aiken/crypto/bls12_381/scalar
use aiken/option
use aiken/primitive/bytearray
use cardano/address.{Address, Script, VerificationKey, with_delegation_script}
use cardano/assets
use cardano/certificate.{DelegateBlockProduction, RegisterAndDelegateCredential}
use cardano/transaction.{
  InlineDatum, Input, NoDatum, Output, OutputReference, Transaction,
}
use types.{Proof, ZkDatum, ZkVerificationKey}
use utils.{build_challenge, hash_challenge, zk_verify}

test verify_challenge_certs() {
  trace @"userId": scalar.from_bytearray_big_endian(#"466f6e74757323303030")
  let userId = #"466f6e74757323303030"
  let hash =
    bytearray.from_int_big_endian(
      10343661163184219313272354919635983875711247223011266158462328948931637363678,
      32,
    )
  let zkey =
    ZkVerificationKey {
      vk_alpha1: #"b18db01619508d589ba45cdcc9c9ab4dbddc33e08bc4dbddea565c10dc743fd66510d3f49c6343999caf540eaa0c4e03",
      vk_beta2: #"845f7a4f6d0fbcaf0648d9c2657f19a33f4e2124c284d68688f209abf54d5a1d1afc47de55c24e662c47f7632a760a8016e8ba01eb4b0d4a2db67fe5abed5ae1a09e035dbe984a1426e440a4f0038276792f87cdb2bc35dc185a618d352d7f54",
      vk_gamma2: #"93e02b6052719f607dacd3a088274f65596bd0d09920b61ab5da61bbdc7f5049334cf11213945d57e5ac7d055d042b7e024aa2b2f08f0a91260805272dc51051c6e47ad4fa403b02b4510b647ae3d1770bac0326a805bbefd48056c8c121bdb8",
      vk_delta2: #"a2341a098a95305955386a3e0e4e2879e6206342b9c9a8da0559190e82f3ed1478158f2ca1ef4db7deab124b7c85b0f403d1a968b4812e6c9c9392d926b86da501e23f6c94cffcc62b02393d7807a6f381e40ca49a9b4a2b522518f72927ca15",
      vk_ic: [
        #"ac2fcd68b85b64e6c3bc11a9dadd1b24e7786738475cf2fe0acdd9b41f773af18ec12601e368d2e920f299f9e6bed480",
        #"a33061a2549ea773d275539b2e92caa6f936404635db1da3199ec71f06faf2cba8effef6860bcb0376259a681ef043c3",
        #"a3f6177ea5ef5797249df745be266271bd65a6a1c9c9fae2df3dd2c7e9e6b5751f288fba11950455a9a1f9a054bad854",
        #"a5d227c013957479be181bf43c394a49e8bf14585fd04a4ca72102e3e5ab41661411eeb15986ad3d3a09eb25bb2b7b12",
        #"93a152a9cd7d4b81a08989f67fcb958e96b14ef4d3cefd26ad992059df4d252a9f00b5f9f2b5b8a59cf4eca9d7884893",
        #"b8cd6daceeaa3b53d707ae2b99dc87e0dbbf58a1e310cff5cd3bea151d90962372de834a519a879c05bc470a016202d6",
        #"a6b5d4a12faf84ac46dba1793716cdb14009af64d0edcd5f1c0ca872fa53bc5732da912222fc3d4fc7ea2fc1b9fbff41",
      ],
    }
  let data = ZkDatum { userId, hash, zkey }
  let scriptHash = #"45e7ce17366d83c4c25d37ec2f9039cb614a305fdb4bead40f424876"
  let addr =
    Address { payment_credential: Script(scriptHash), stake_credential: None }

  let address = with_delegation_script(addr, scriptHash)
  let policyId = #"b8a5e329b500a66376047165cdfce62c3ecf245fd81d101533f81422"
  let assetName = #"466f6e74757323303030"
  let output =
    Output {
      address,
      value: assets.from_asset_list(
        [Pair("", [Pair("", 4_366_030)]), Pair(policyId, [Pair(assetName, 1)])],
      ),
      datum: InlineDatum(data),
      reference_script: None,
    }
  let txId = #"d6da036c1aeb7680323258c763a2a6e25be9b280c2a8fedd5e43cb89730fdadf"
  let index = 0
  let outputReference =
    OutputReference { transaction_id: txId, output_index: index }
  let input = Input { output_reference: outputReference, output }
  let cert =
    RegisterAndDelegateCredential {
      credential: Script(scriptHash),
      delegate: DelegateBlockProduction {
        stake_pool: #"094dc39da2d8434f9ddb93749a1930288e5dd89ae04fa5914e157bd6",
      },
      deposit: 2_000_000,
    }
  let tx =
    Transaction {
      ..transaction.placeholder,
      reference_inputs: [input],
      inputs: [
        Input {
          output_reference: OutputReference {
            transaction_id: #"76004ab7e110948007c14da402e873986f7c844755f1f62eabe25155d9610757",
            output_index: 0,
          },
          output: Output {
            address,
            value: assets.from_lovelace(10_000_000),
            datum: NoDatum,
            reference_script: None,
          },
        },
      ],
      outputs: [
        Output {
          address: Address {
            payment_credential: VerificationKey(
              #"3dce7844f36b23b8c3f90afba40aa188e7f1d3f6e8acd1d544ed1da9",
            ),
            stake_credential: None,
          },
          value: assets.from_lovelace(6_662_059),
          datum: NoDatum,
          reference_script: None,
        },
      ],
      certificates: [cert],
    }
  let challenge =
    #"6dbf8d3c5baa10de47810fe06839674798445ca84af0236fba34b661c36a7ea3"
  let build_challenge = build_challenge(tx) |> hash_challenge
  trace @"Cert": cert |> cbor.serialise
  challenge == build_challenge
}

test verify_zk_proof_1() {
  let zkey =
    ZkVerificationKey {
      vk_alpha1: #"b18db01619508d589ba45cdcc9c9ab4dbddc33e08bc4dbddea565c10dc743fd66510d3f49c6343999caf540eaa0c4e03",
      vk_beta2: #"845f7a4f6d0fbcaf0648d9c2657f19a33f4e2124c284d68688f209abf54d5a1d1afc47de55c24e662c47f7632a760a8016e8ba01eb4b0d4a2db67fe5abed5ae1a09e035dbe984a1426e440a4f0038276792f87cdb2bc35dc185a618d352d7f54",
      vk_gamma2: #"93e02b6052719f607dacd3a088274f65596bd0d09920b61ab5da61bbdc7f5049334cf11213945d57e5ac7d055d042b7e024aa2b2f08f0a91260805272dc51051c6e47ad4fa403b02b4510b647ae3d1770bac0326a805bbefd48056c8c121bdb8",
      vk_delta2: #"a2341a098a95305955386a3e0e4e2879e6206342b9c9a8da0559190e82f3ed1478158f2ca1ef4db7deab124b7c85b0f403d1a968b4812e6c9c9392d926b86da501e23f6c94cffcc62b02393d7807a6f381e40ca49a9b4a2b522518f72927ca15",
      vk_ic: [
        #"ac2fcd68b85b64e6c3bc11a9dadd1b24e7786738475cf2fe0acdd9b41f773af18ec12601e368d2e920f299f9e6bed480",
        #"a33061a2549ea773d275539b2e92caa6f936404635db1da3199ec71f06faf2cba8effef6860bcb0376259a681ef043c3",
        #"a3f6177ea5ef5797249df745be266271bd65a6a1c9c9fae2df3dd2c7e9e6b5751f288fba11950455a9a1f9a054bad854",
        #"a5d227c013957479be181bf43c394a49e8bf14585fd04a4ca72102e3e5ab41661411eeb15986ad3d3a09eb25bb2b7b12",
        #"93a152a9cd7d4b81a08989f67fcb958e96b14ef4d3cefd26ad992059df4d252a9f00b5f9f2b5b8a59cf4eca9d7884893",
        #"b8cd6daceeaa3b53d707ae2b99dc87e0dbbf58a1e310cff5cd3bea151d90962372de834a519a879c05bc470a016202d6",
        #"a6b5d4a12faf84ac46dba1793716cdb14009af64d0edcd5f1c0ca872fa53bc5732da912222fc3d4fc7ea2fc1b9fbff41",
      ],
    }
  let pA =
    #"b5954b04ea1d2956fac946a3dabbe826cc4651322c23423a245d65f528bd5adead5aee7cbcfc3d86ae96a9ecfc40d3e8"
  let pB =
    #"a3f50879ce5f27741ef8b0dfaf4b100f1fbc9ed503c2edd901dfbd080c449e40c97c8e465d191514565ede494209181e00f121f68062b2e6048d566ccfab5bd01271ade34d9e07362c41635ea371aef4487302db945e8aa8664ed73214a68216"
  let pC =
    #"aa0b4443bb50d1c93ce088b2df5abb315fceb183c709008e071c196ae4e6d1a969ed62b747f4bf84e9d22eea9278dd9a"
  let proof = Proof { pA, pB, pC }
  let userId = option.or_else(scalar.new(332621201508635767746608), scalar.one)
  let hash =
    option.or_else(
      scalar.new(
        10343661163184219313272354919635983875711247223011266158462328948931637363678,
      ),
      scalar.one,
    )
  let challenge =
    option.or_else(
      scalar.new(
        51891613829265625378560554888192412376874405841139917857278942238725157370276,
      ),
      scalar.one,
    )
  let public = [userId, hash, challenge, userId, challenge, hash]
  zk_verify(proof, public, zkey)
}

test verify_zk_proof_2() {
  let zkey =
    ZkVerificationKey {
      vk_alpha1: #"b18db01619508d589ba45cdcc9c9ab4dbddc33e08bc4dbddea565c10dc743fd66510d3f49c6343999caf540eaa0c4e03",
      vk_beta2: #"845f7a4f6d0fbcaf0648d9c2657f19a33f4e2124c284d68688f209abf54d5a1d1afc47de55c24e662c47f7632a760a8016e8ba01eb4b0d4a2db67fe5abed5ae1a09e035dbe984a1426e440a4f0038276792f87cdb2bc35dc185a618d352d7f54",
      vk_gamma2: #"93e02b6052719f607dacd3a088274f65596bd0d09920b61ab5da61bbdc7f5049334cf11213945d57e5ac7d055d042b7e024aa2b2f08f0a91260805272dc51051c6e47ad4fa403b02b4510b647ae3d1770bac0326a805bbefd48056c8c121bdb8",
      vk_delta2: #"a2341a098a95305955386a3e0e4e2879e6206342b9c9a8da0559190e82f3ed1478158f2ca1ef4db7deab124b7c85b0f403d1a968b4812e6c9c9392d926b86da501e23f6c94cffcc62b02393d7807a6f381e40ca49a9b4a2b522518f72927ca15",
      vk_ic: [
        #"ac2fcd68b85b64e6c3bc11a9dadd1b24e7786738475cf2fe0acdd9b41f773af18ec12601e368d2e920f299f9e6bed480",
        #"a33061a2549ea773d275539b2e92caa6f936404635db1da3199ec71f06faf2cba8effef6860bcb0376259a681ef043c3",
        #"a3f6177ea5ef5797249df745be266271bd65a6a1c9c9fae2df3dd2c7e9e6b5751f288fba11950455a9a1f9a054bad854",
        #"a5d227c013957479be181bf43c394a49e8bf14585fd04a4ca72102e3e5ab41661411eeb15986ad3d3a09eb25bb2b7b12",
        #"93a152a9cd7d4b81a08989f67fcb958e96b14ef4d3cefd26ad992059df4d252a9f00b5f9f2b5b8a59cf4eca9d7884893",
        #"b8cd6daceeaa3b53d707ae2b99dc87e0dbbf58a1e310cff5cd3bea151d90962372de834a519a879c05bc470a016202d6",
        #"a6b5d4a12faf84ac46dba1793716cdb14009af64d0edcd5f1c0ca872fa53bc5732da912222fc3d4fc7ea2fc1b9fbff41",
      ],
    }
  let pA =
    #"af46f51c9067ff3f6ae57ba0f76d9de33e979d01c0f91a40fc600f467b8fd0a3804d1968c2836632d728450b5d2614d4"
  let pB =
    #"816dc1b644722dcaf92aba79949fb514b19f0289dec36e9d49e9fec755244636e321ac6e6d37cc78381fc37eced6e5d7057e8187d6fd098df9647146154565800cbd3f64a809bb4e565416c967c60ad6e32f83a9def38b0ad5ba826ec45a1e0a"
  let pC =
    #"8881425d2cf63d3e019a4eb858b79d536804ce76ee499dc562cf0bac94db104963f7599c96ee98b2f47c58a780c62980"
  let proof = Proof { pA, pB, pC }
  let userId = option.or_else(scalar.new(332621201508635767746608), scalar.one)
  let hash =
    option.or_else(
      scalar.new(
        10343661163184219313272354919635983875711247223011266158462328948931637363678,
      ),
      scalar.one,
    )
  let challenge =
    option.or_else(
      scalar.new(
        28076471370584806019427378065158897909801938413109722386793687859420994098272,
      ),
      scalar.one,
    )
  let public = [userId, hash, challenge, userId, challenge, hash]
  zk_verify(proof, public, zkey)
}

test verify_zk_proof_3() {
  let zkey =
    ZkVerificationKey {
      vk_alpha1: #"b18db01619508d589ba45cdcc9c9ab4dbddc33e08bc4dbddea565c10dc743fd66510d3f49c6343999caf540eaa0c4e03",
      vk_beta2: #"845f7a4f6d0fbcaf0648d9c2657f19a33f4e2124c284d68688f209abf54d5a1d1afc47de55c24e662c47f7632a760a8016e8ba01eb4b0d4a2db67fe5abed5ae1a09e035dbe984a1426e440a4f0038276792f87cdb2bc35dc185a618d352d7f54",
      vk_gamma2: #"93e02b6052719f607dacd3a088274f65596bd0d09920b61ab5da61bbdc7f5049334cf11213945d57e5ac7d055d042b7e024aa2b2f08f0a91260805272dc51051c6e47ad4fa403b02b4510b647ae3d1770bac0326a805bbefd48056c8c121bdb8",
      vk_delta2: #"a2341a098a95305955386a3e0e4e2879e6206342b9c9a8da0559190e82f3ed1478158f2ca1ef4db7deab124b7c85b0f403d1a968b4812e6c9c9392d926b86da501e23f6c94cffcc62b02393d7807a6f381e40ca49a9b4a2b522518f72927ca15",
      vk_ic: [
        #"ac2fcd68b85b64e6c3bc11a9dadd1b24e7786738475cf2fe0acdd9b41f773af18ec12601e368d2e920f299f9e6bed480",
        #"a33061a2549ea773d275539b2e92caa6f936404635db1da3199ec71f06faf2cba8effef6860bcb0376259a681ef043c3",
        #"a3f6177ea5ef5797249df745be266271bd65a6a1c9c9fae2df3dd2c7e9e6b5751f288fba11950455a9a1f9a054bad854",
        #"a5d227c013957479be181bf43c394a49e8bf14585fd04a4ca72102e3e5ab41661411eeb15986ad3d3a09eb25bb2b7b12",
        #"93a152a9cd7d4b81a08989f67fcb958e96b14ef4d3cefd26ad992059df4d252a9f00b5f9f2b5b8a59cf4eca9d7884893",
        #"b8cd6daceeaa3b53d707ae2b99dc87e0dbbf58a1e310cff5cd3bea151d90962372de834a519a879c05bc470a016202d6",
        #"a6b5d4a12faf84ac46dba1793716cdb14009af64d0edcd5f1c0ca872fa53bc5732da912222fc3d4fc7ea2fc1b9fbff41",
      ],
    }
  let pA =
    #"b93b1886cae4cc59622f0fdde89c76b34f32f37f523618118da4cc92133054a76f5f3a4651ee2455a09395d340e70ed5"
  let pB =
    #"88fb7828c74ad5acd71e378fe7cec93920ba38ac51c638c600f828e8cf0a726ee78f8a00b95a25089eed0fffec2193110891bfb24c9f587a270d521eca65407fa3f5d76c8e73df17c0155b9ee808ad1fe95bda518fe6e8576516a2e6c330f80b"
  let pC =
    #"aec773e18eb01d1772b09dee3f56ccffabc2b6af595f6b8ab7516569f381ec357669997d70eaa37c2869c53093cc5b40"
  let proof = Proof { pA, pB, pC }
  let userId =
    option.or_else(
      scalar.new(
        52435875175126190479447740508185965837690552500527637822603658699938581184512,
      ),
      scalar.one,
    )
  let hash =
    option.or_else(
      scalar.new(
        10343661163184219313272354919635983875711247223011266158462328948931637363678,
      ),
      scalar.one,
    )
  let challenge =
    option.or_else(
      scalar.new(
        28076471370584806019427378065158897909801938413109722386793687859420994098272,
      ),
      scalar.one,
    )
  let public = [userId, hash, challenge, userId, challenge, hash]
  zk_verify(proof, public, zkey)
}

test verify_zk_proof_4() {
  let zkey =
    ZkVerificationKey {
      vk_alpha1: #"b18db01619508d589ba45cdcc9c9ab4dbddc33e08bc4dbddea565c10dc743fd66510d3f49c6343999caf540eaa0c4e03",
      vk_beta2: #"845f7a4f6d0fbcaf0648d9c2657f19a33f4e2124c284d68688f209abf54d5a1d1afc47de55c24e662c47f7632a760a8016e8ba01eb4b0d4a2db67fe5abed5ae1a09e035dbe984a1426e440a4f0038276792f87cdb2bc35dc185a618d352d7f54",
      vk_gamma2: #"93e02b6052719f607dacd3a088274f65596bd0d09920b61ab5da61bbdc7f5049334cf11213945d57e5ac7d055d042b7e024aa2b2f08f0a91260805272dc51051c6e47ad4fa403b02b4510b647ae3d1770bac0326a805bbefd48056c8c121bdb8",
      vk_delta2: #"a2341a098a95305955386a3e0e4e2879e6206342b9c9a8da0559190e82f3ed1478158f2ca1ef4db7deab124b7c85b0f403d1a968b4812e6c9c9392d926b86da501e23f6c94cffcc62b02393d7807a6f381e40ca49a9b4a2b522518f72927ca15",
      vk_ic: [
        #"ac2fcd68b85b64e6c3bc11a9dadd1b24e7786738475cf2fe0acdd9b41f773af18ec12601e368d2e920f299f9e6bed480",
        #"a33061a2549ea773d275539b2e92caa6f936404635db1da3199ec71f06faf2cba8effef6860bcb0376259a681ef043c3",
        #"a3f6177ea5ef5797249df745be266271bd65a6a1c9c9fae2df3dd2c7e9e6b5751f288fba11950455a9a1f9a054bad854",
        #"a5d227c013957479be181bf43c394a49e8bf14585fd04a4ca72102e3e5ab41661411eeb15986ad3d3a09eb25bb2b7b12",
        #"93a152a9cd7d4b81a08989f67fcb958e96b14ef4d3cefd26ad992059df4d252a9f00b5f9f2b5b8a59cf4eca9d7884893",
        #"b8cd6daceeaa3b53d707ae2b99dc87e0dbbf58a1e310cff5cd3bea151d90962372de834a519a879c05bc470a016202d6",
        #"a6b5d4a12faf84ac46dba1793716cdb14009af64d0edcd5f1c0ca872fa53bc5732da912222fc3d4fc7ea2fc1b9fbff41",
      ],
    }
  let pA =
    #"b93b1886cae4cc59622f0fdde89c76b34f32f37f523618118da4cc92133054a76f5f3a4651ee2455a09395d340e70ed5"
  let pB =
    #"88fb7828c74ad5acd71e378fe7cec93920ba38ac51c638c600f828e8cf0a726ee78f8a00b95a25089eed0fffec2193110891bfb24c9f587a270d521eca65407fa3f5d76c8e73df17c0155b9ee808ad1fe95bda518fe6e8576516a2e6c330f80b"
  let pC =
    #"aec773e18eb01d1772b09dee3f56ccffabc2b6af595f6b8ab7516569f381ec357669997d70eaa37c2869c53093cc5b40"
  let proof = Proof { pA, pB, pC }
  let userId =
    option.or_else(
      scalar.new(
        52435875175126190479447740508185965837690552500527637822603658699938581184512,
      ),
      scalar.one,
    )
  let hash =
    option.or_else(
      scalar.new(
        52435875175126190479447740508185965837690552500527637822603658699938581184512,
      ),
      scalar.one,
    )
  let challenge =
    option.or_else(
      scalar.new(
        52435875175126190479447740508185965837690552500527637822603658699938581184512,
      ),
      scalar.one,
    )
  let public = [userId, hash, challenge, userId, challenge, hash]
  !zk_verify(proof, public, zkey)
}

test verify_zk_proof_5() {
  let max =
    104871750350252380958895481016371931675381105001055275645207317399877162369025
  let max_challenge =
    bytearray_to_integer(
      True,
      #"e7db4ea6533afa906673b0101343b00aa77b4805fffcb7fdfffffffe00000001",
    )
  expect (Some(challenge), overflow) =
    when scalar.new(max_challenge) is {
      None -> (scalar.new(mod_integer(max_challenge, scalar.field_prime)), 1)
      n -> (n, 0)
    }

  scalar.to_int(challenge) + 1 == scalar.field_prime && max_challenge == max
}

test verify_zk_proof_performance() {
  let zkey =
    ZkVerificationKey {
      vk_alpha1: #"b18db01619508d589ba45cdcc9c9ab4dbddc33e08bc4dbddea565c10dc743fd66510d3f49c6343999caf540eaa0c4e03",
      vk_beta2: #"845f7a4f6d0fbcaf0648d9c2657f19a33f4e2124c284d68688f209abf54d5a1d1afc47de55c24e662c47f7632a760a8016e8ba01eb4b0d4a2db67fe5abed5ae1a09e035dbe984a1426e440a4f0038276792f87cdb2bc35dc185a618d352d7f54",
      vk_gamma2: #"93e02b6052719f607dacd3a088274f65596bd0d09920b61ab5da61bbdc7f5049334cf11213945d57e5ac7d055d042b7e024aa2b2f08f0a91260805272dc51051c6e47ad4fa403b02b4510b647ae3d1770bac0326a805bbefd48056c8c121bdb8",
      vk_delta2: #"8e5796ace888fd643418178b2db8f80c170c5e9c354e116e85f504eb8408cd40e90952222121e9e08a30ad95f46dba32086b9d84370c59c06bc8c209e8f8b43b22f7899a5a79559cb0a2126b2d26460ac3b4a2f8d2586ce49ffd9dbe5a081c13",
      vk_ic: [
        #"a46d067684adc323d799d6f3fbe954355a0aef435306756e1d6a155a128b29fa6272e6d7b764ceb72c08b62a99eece9f",
        #"a995e5030b8bb094cd5979ac22e5a102cffb93a27e68bbba9c53ab8db6bc7d142ba29733331fcd1efd598136b159e1c8",
        #"a66a4baf54fb9fd9f5b6fcb39372327b7663a2ddf1d0cf01c0e33c41b14d2a0d90fc6a253713fc2e1d4f71cdc656bcb7",
        #"922d8796f14639d88eeab4b6563350e7f3bb8ab2b2543f6b1203930e8df6b3607c545e191a9235962011b22ae7a873df",
        #"907323e981b8ca804b93f3fedfbcf920afa884365698bb26e2bd6cf1e5c470f38414545074530404d4e9c844aa7e7590",
      ],
    }
  let pA =
    #"b1b281e0d3ecd76171442635713dfa878e118385d2e9cd355067ea205459225bef48c91a1b8a71ca003319e2622ce71d"
  let pB =
    #"a6946374ebf1c51e7cbf6f51daf37e1e68d9d22a2798cba9dbc4160674856346021e6b22bcff6c07356f48b1783f088d15a224d577482ee6a8982b4abbf00bdf0b4fb5e627c958e7bc419aed02852e5d5c07b2966aaab7a4012dd625e92b29f3"
  let pC =
    #"864f0956fc1f489b1e9fc0ee00a29afea7e19c8ae5e80facfe321bb55c57a2026d504fbddac6cb0b7d7a9e2716701c27"
  let proof = Proof { pA, pB, pC }
  let userId =
    option.or_else(
      scalar.new(
        52435875175126190479447740508185965837690552500527637822603658699938581184512,
      ),
      scalar.one,
    )
  let challenge =
    option.or_else(
      scalar.new(
        52435875175126190479447740508185965837690552500527637822603658699938581184512,
      ),
      scalar.one,
    )
  let challengeFlag = scalar.one
  let hash =
    option.or_else(
      scalar.new(
        52435875175126190479447740508185965837690552500527637822603658699938581184512,
      ),
      scalar.one,
    )
  let public = [userId, challenge, challengeFlag, hash]
  !zk_verify(proof, public, zkey)
}
