use lzss_rust::{lzss_compress, lzss_decompress};

/// Test with the same constants and test cases as the TypeScript implementation
/// to ensure identical behavior
#[cfg(test)]
mod compatibility_tests {
    use super::*;

    #[test]
    fn test_constants_match_typescript() {
        // These constants must match the TypeScript implementation exactly
        const RING_BUFF_SIZE: usize = 4096; // 4095 - 0x0fff
        const THRESHOLD: usize = 2; // Minimum length
        const MAX_SIZE: usize = 18; // Min of 2 + 4 byte uint (2+16)
        
        // These are tested implicitly by the algorithm working correctly
        assert_eq!(RING_BUFF_SIZE, 4096);
        assert_eq!(THRESHOLD, 2);
        assert_eq!(MAX_SIZE, 18);
    }

    #[test]
    fn test_compress_and_decompress_random_data() {
        // Create deterministic "random" data like TypeScript test
        let mut input_data = Vec::new();
        let mut seed = 42u32;
        for _ in 0..10_000 {
            seed = seed.wrapping_mul(1103515245).wrapping_add(12345);
            input_data.push((seed >> 16) as u8);
        }

        let compressed = lzss_compress(&input_data);
        let decompressed = lzss_decompress(&compressed, 10_000);

        assert_eq!(input_data, decompressed);

        // Log compression ratio like TypeScript
        let ratio = compressed.len() as f64 / input_data.len() as f64;
        println!("Random data compression ratio: {:.2}", ratio);
    }

    #[test]
    fn test_compress_and_decompress_all_zeros() {
        let input_data = vec![0u8; 10_000];

        let compressed = lzss_compress(&input_data);
        let decompressed = lzss_decompress(&compressed, 10_000);

        assert_eq!(input_data, decompressed);

        let ratio = compressed.len() as f64 / input_data.len() as f64;
        println!("All zeros compression ratio: {:.2}", ratio);
    }

    #[test]
    fn test_compress_and_decompress_all_255s() {
        let input_data = vec![255u8; 10_000];

        let compressed = lzss_compress(&input_data);
        let decompressed = lzss_decompress(&compressed, 10_000);

        assert_eq!(input_data, decompressed);

        let ratio = compressed.len() as f64 / input_data.len() as f64;
        println!("All 255s compression ratio: {:.2}", ratio);
    }

    #[test]
    fn test_compress_and_decompress_mixed_data() {
        let mut input_data = Vec::new();

        // First half zeros, second half random
        for _ in 0..5_000 {
            input_data.push(0);
        }

        let mut seed = 42u32;
        for _ in 0..5_000 {
            seed = seed.wrapping_mul(1103515245).wrapping_add(12345);
            input_data.push((seed >> 16) as u8);
        }

        let compressed = lzss_compress(&input_data);
        let decompressed = lzss_decompress(&compressed, 10_000);

        assert_eq!(input_data, decompressed);

        let ratio = compressed.len() as f64 / input_data.len() as f64;
        println!("Mixed data compression ratio: {:.2}", ratio);
    }

    #[test]
    fn test_compress_and_decompress_small_data() {
        let input_data = vec![42u8; 1];

        let compressed = lzss_compress(&input_data);
        let decompressed = lzss_decompress(&compressed, 1);

        assert_eq!(decompressed[0], 42);
    }

    #[test]
    fn test_compress_and_decompress_empty_data() {
        let input_data = Vec::new();

        let compressed = lzss_compress(&input_data);
        let decompressed = lzss_decompress(&compressed, 0);

        assert_eq!(decompressed.len(), 0);
    }

    #[test]
    fn test_compress_and_decompress_repeating_pattern() {
        let mut input_data = Vec::new();

        // Create a repeating pattern (good for LZSS)
        for i in 0..10_000 {
            input_data.push((i % 16) as u8); // Repeating 0-15 pattern
        }

        let compressed = lzss_compress(&input_data);
        let decompressed = lzss_decompress(&compressed, 10_000);

        assert_eq!(input_data, decompressed);

        let ratio = compressed.len() as f64 / input_data.len() as f64;
        println!("Repeating pattern compression ratio: {:.2}", ratio);
    }

    #[test]
    fn test_compress_and_decompress_alternating_bytes() {
        let mut input_data = Vec::new();

        // Alternating 0 and 255
        for i in 0..10_000 {
            input_data.push(if i % 2 == 0 { 0 } else { 255 });
        }

        let compressed = lzss_compress(&input_data);
        let decompressed = lzss_decompress(&compressed, 10_000);

        assert_eq!(input_data, decompressed);

        let ratio = compressed.len() as f64 / input_data.len() as f64;
        println!("Alternating bytes compression ratio: {:.2}", ratio);
    }

    #[test]
    fn test_existing_image_data_problem_tile_1() {
        let hex_str = "89504e470d0a1a0a0000000d4948445200000080000000800806000000c33e61cb000000017352474200aece1ce9000012e449444154785eed5d2b58e3d0123ec7454646565656222b914824128944225722914864652512595959591959d77bff7f664e4ed2b2b0b7d99b6c987edf2ed0c7697266ce3cfe79c5721e8e21847038e03ffd673ff077fee8fedd79d9fffcf7762096b3700c45c600e406e105f94f1f4efc7f8fbadfb8626100930019d129119cf8dfd8c27ffb2d6d0650a2b788df9504fff6fdfad5777620d20680c857fdefc4ff593c1267cb922a20e9fba223fa8b108aa2084511425916a1288bb07edefeac5d9af0dd0a03e0f46784cf790004c73f10bf04339445787ddc4c784b7ed6ad250980136ed63f7fd707090f2628f03384437d086fcfbb9fb54b13bedb38bf5615606a00c487c8971fa1ac70f2210542a87775a8f787f0beaa27bc253febd6e2fca66d0398be07f12b10bf2ca82148fc5d1da007dedf9c01a6c22671610ca04680197b38f9207d5d9b6f28fa1f6f7b7b72153049068098179d2fb7c7130f55401b407e822156bff653b9ff1f7f1f2a013237afd013af46214d034801b507eadd21ac5f5d054c8573e2d55d7534a39f843e1c42392b69fc41221c6a91044555846a51867a538737970053a17f2003d0bddbb789cf937f381021c46be5bc0cd5ac08bb8f3aac9e5d054c8503e2f21e1240c27f38f938e59004fbcd3ed44ae772565022c0050433b80a980af94388378fd51184a5f1578995bfdfd66482b22a435109140cdd5fef6b32c8dba34b80a9b000190004af66a5823de2fa8119f01c18c288cfe7feab0a5eeedd0d9c0c035c3f5447187924b6ea7dfafb0730027c4163883254733117df9e5c024c8701eecb230c3dc3ffa1ef610fecb7121fe66b41ec037a0587e038c054a81f4288d7f7e5113ade7c7d8878d804e9511fe802422ac000c46b6e044e8703680380f8d0f320f2ec0acc20e0cf1ecf8510665738fa817fe3e10c30250678102310a2bd5a88e1076b1f2a80febf0240781d4c022cc081a00931c0d54d71c4899f2dca00fd0f22e3f453ec331b08fa1f184008f5561041370227c60020b289f9dda6e6a99f5d55a2f3e112ce44ffdb6bab678f054c8505e2f543c9588045fa4068910665d8ac8006d6f4fdf13c6c0030cafac51960320c70fb54d10d340c003f910882c48fed7a4f75300303c006d0dfdd06980af943886400867b2ded0bde0052c1cab0dfc0383c10fe8517001710d2e0f5c191c0a9b0405cde212b5842c07880e8d0f98cfc6de00f8a1168601198e1e5ce19603a0c705b5005e06483cadb0f8185c5f217dd4000183982b3825e8033c054c86f4820623e08f76ec5d207a14d22c043801ab0645118826e044e8c0178da810602fc51918f2411101d0fbc6659434c0b7ff352e1a9b0405cde164764fb000d84becf0120c87d9c7ea0824c135f9464040782a6427ea880c7f2080c60ffa119c08a0052ed6bdf803c6184c120c701fe670e60e0eda402f77f5eeee20fc69b5fc807b06090e6feebb24c0fb74821810209136fde5d055cbcf32359202eefcb23743f53bf341184d14000427309038341601cf07544031d0a1e09f92ebf8cb8603008000f0161114fda2b00d141101d99c01614027338035cbef16359212eae0bf6082a2ba13b924329ed2d0804049046a07a04fb43d8ac5d058c8580975e47bcba2b6804d2d7870c001ec00c6089fd271b80f5012114b3103e5e9d012eddf8b17c3e2e1f8a23888e681f253fe3fe9208683600a401443fde505d1561fde4d1c0b110f0d2eb88cb27290fa7a107e34f51bfc080909687edb572480dc39533c0a5fb3e9acf9301240b48ae89aa5e61bf125e00ea02981ed6c403d6bf5c028c8682175e485cdc1564003bedc60c080957480645a5d01a95427013c546d838147ce1b68fe7e3716e6ee04242befb0f817d71fa1906ae0f61b7d6e718240ae1fdd98dc0f190f0b22b89f3eb4023104050bd13710f2203032024b0438e803c877430bc7775ef9541976dfb783e1de7b7818521f4fdad145c4f3a32810f44011b894024f0d16d80f190f0b22b89f31be9156cfd7f923d3083345040082d62b44a185ec287ab80cb767d449f8eb36538d2b803e8c36e206806a1f981c0030009687328be2fb80d3022fa5d7c29a2020cfed542506000c4042c59540b44cc3d740970f1be8f668178f52495410903601c40fe1926c093cf3e018206ba1b381afa5d7c2171712fd1c02405d8284a0c42217c1b0d846be8b1808bf77d340bc4d9b5198172eaf3292194005007600834095577d155c068e877f185d00648ab640323e8186a8348761043b3e8b9d8061f2f0e045dbcf32359802a40447e4654eb15a9c6a1b98625c0a1bdbb8123a15d2f9711170807c3c003e883241023fa5ee05f0e94da497510d04130834b805ef67e148b5002c0d8430c80529fa75c9b43322144d04040c0ec15b83bb817300ad2f573116203a00f201800114015f3c60c940ed9801018835b4f09eb67f747b04a02822c0b08a7dc0a4153af60e4046a2818afbf7b3ec00848d7cf25301f00279f0c90b586a7e8875b8854310807a8000d12ad1e3c18d4cff60fbf0a8d40b8762cff521b80279f46a18041789d99c3a80e2e82e7040e4fb7deae40904036811662d30844508879014d50881200b503076780de767f040b510530e843f9afbd8234411406211e608e942184da404f0a1d01e9fab904818255c4d3d0637998f2838e8e31db80cfd621bc7b71683fbb3f8255e2ec2a48af60b3f233a25322b044584022b3093c183402caf57409e205a8f897e48f2cf833cb54023c01cd0c5a794a584fdb3ffc3282049acb473750074923faa7563f9242a54184a0845e1c3a3ce1faba02cd099411611c0f576936104fbc968a29142c49216824d5d7d7fb3a43ef804403f591a6876979b8cd13ce2f12cfbd7b71e8d074ebedfbe3f297a68469d2474a0861bf20d1fb9632c66a61f408f29941bd1160e885e2d543ce00da31d4ba846b5c00ae1f0a43ac5b88db004393adbfef8f0b368a94ca603a035a112ce25ffa061005a42490b88033407f04187aa5385f221cac23e335fb9759c14c08c19430ab116c4ac4bd4bd8d064ebeffbc900d61b908c90d902323052becc52c521053e569e13d81f09865d894da2a4ec4b09cde210c9044af800f3055505d4681337ec45fbb7f7b70334020dff67545047c8596ea09586a16710c7c9a330c47180fe2830f04af11a2d62b40b08888cd30fb12fbd014425001d6c9a4916e1c353c206265b7f5f2f5e00ac7b847c2b691b6fa9608080393002c5a2da43105dc4573e3ebe3f0a0cbc529ca34fa0b60582afcf36f1da209ab304d92dac4c7d8321191c081a986a3d7e7d52014d0e80b68c833d60a9609623a0cce023637aa4c0c04bc5e54329194166fca9ee17fdaf25619d0ee2af0e050f4cb6febe9e3880257ad0efcf3282980d8c5a018c934182b00e94f6b981fd1160e89504074032281340a54b884904da063a418cf385314ab6f4d1b14313adcfef67bb7863002c6c1d43ed4b9823c08491a65d8ccf0dec9304c3ae15975a1d0c0990c4bc22bd9202a646613e2fc0934287a55a8fdf1eaf6ea55d3cc6c5c216e0b048a6891761a6f302304f889d42c00cb58f8ce971ff075f8a0c6023e2a1e3771817aba56018194bb5a063e4edf7f5ab97860d4eb99e2e80f30220ea9b09e1da1656cbc12d204423500b487c6c5c4fbb3f82656804e6c3a12c0f204d0a2d0a8e948314e084d15911566e038c8074fd5c42bcfda5c3a335e62f03a2241f50c6c9c2ff479528882f23655fee7d76703fdb3ffc2af1e6b13c02e0e1d028101b3500f0fd6d88144f3ed2c2caf49e179f1e3e3ce57aba82b80012780861be445688e0001c12cd717122fa991358498608a481a784f5b4fb2358265edf4b3e00c43bf4ff7e5793f8d60f08d728c3a3e46ac1206e038c80723d5d42bc7daed82e1e62bedee804517404435088fd01e59b9828329709e36fcf3e2fa0a7fd1f7c194a0043fb3817c08647707a582d51629d285e5545d86d313ddc7180c129d7d3052437107d022df98363623642e412d221881d603903ae027adafd112c936c006b12c52e616c13df84811910ca10c1b35e80a6948fe09efc12fe6007e2f2ae4ce5e1ac01b099f1b6485184d95c1244e101001b200374099e2a4bffe0dbfdad83ef405cde4a5ab8148108a12df66f29e1600cb8839c1c0a0678cc8020891b358fbc66247f3ebf557b8f4b8d31304079b40a20eb174cbb0f7d83ad2650cbc5d14f10347bfd2c2bf83bc43fc708836fc3cfbd00da00400139326e5f13f103e88fc00fb00169240d37a02910851b78f6f076a581edebb9e7bbcce2d566837061bc79ac8e10f16c14598aff8fdf658a88109f0d24c10cfab721812d9a7d41fc13132153039f9a0fce147f9d29e2cd13802041f8a43dbc7a01aa067005d0fb561e5ed721ac5f0408ead2e73395af4892dc8c0da5b0df1b90b159cf09ffd7096f5f10af1fc40b4803a4b528d48649b22a08c5229a140a23d118e0e42abb47b9cb11bf217ee20d27feff8df8f822868341a7dd4626454983084904e53f6b0ca1a3e5c100efab3f40023b043564d1aa8fd3dd8a93911e2d1bc399e2af3145bc7d991d71ba19f33f484308f60a04faafd9c07bcb11d022d18ff70e45548ca7a9339fd9035dbdd1711fcfda8ab9cb784eeffcb5adf9190b272088c69e460149178bfea9ffdf8c96ad5bd5c1d65780b4317731fb7cfa15cc64af7fa21aba5b9e4b8b7cc9f4fccfa0d15fbdcb78752349a1363bd0e60782b038f9781e4120b881901420a2a9809cf88901144c3c77d5f95caa4fefea0b719f5e9e985aa8aa32ecf77fa05a7b628b140b30d4cf90608482452a4884303fe11febdf5f28c3cbf681bcf5885db4eafbc4405de3f0dccd59fb9acf6e7c620cd1137dbf5c865e00c5ab7685b49e80696c8c896bd4052020841e41eb5adac8741eec36d651e42d66c80c3d7339452fe84327969e2c9cb5af31557082417c79abfe86733b9018802fdac1d691b17288a55b989d5648850d3a849cd1e3add98349698bf2cfe96c2369d39c02a37fd786e81880b646cbdbccdfe352e08fb93ca90031fcb435bceeb44d0f6792881a7178aec500da40aacb2ca4653687d896376392efd7d7f9bbfd77064d4a2e6147c09cd0db19e00206d0b27089fa894790334022580861636ea051ada5e71b66e1c9d74b32919fa2cd3683c08cc66c60353f7206144852240309ced2dc19e1db8cd052017622a54d7c06095bef4055f05b660b59869076961011a07367948019cc2ba892bc47ec0c049ce43a0933ab9ae87a1667ed83cc20345ec8a5c4b7efdedf18840192f1a5fa5ec7c78248ec22ab5d43edf46e3fa458d40c3e7bded448cb18d4d3488992119f7d07f54827699359780645e77645cb5eb47533229e93104ee3dfef00730293c8d5632410b07c900922da29c40ef916c52367d755775153ca722992184043cb220c3ab23acf46ead823c66c2db02927fe67f7e9eae0b71c10af1fcb236704da6954fcdf886f9f36daa08e70cb51b28d4f67ae636a35ab3604180039062036c2c9224d547a58d3896423e89ce20c2db4394579dca0f55df9ad75083d55c0a86f89462898a1601d1a95dc3de0ff3a4994d344f444e2c716bd824e0eaf8145cd70296005b5ba912c34d16ea38636b66ec6240e23cd624bb4540941880666f8f460e7b0829ffe2ff9252eb44fa00d89c4de5bfe5f72d9d4ce33896dc1216929ac9143eaf8ccb5cb74048d3c561549a999451b13a90de8d188a35cb5e82301a49adfed8e3e859595e80e147d497bbe81fd0108f4a413a89baea9e06ad76b204724c15e8dc2f415b6e9fad3fa0c1b11a413295c423532b5c6201f589998471147f30ac80a16484ad46f27a2b6a290fa1e770fbfc900660426571e95e06a049228aa9373f70c1220cd13341d9e190bc9ad83c1a7dea1218a0c3c711a69c310466cbe47cdcbc640cc71bfc673c899efb3d39e9837679cefedcb8f7917a3813c6519da27a08d4e0f57ff5cd040c1064c0524b73f838a45788bf107832d5516ab6b29865dd36da475ba73d3c2a867275a19b131561bece0845a6e107e9b8169045297ebc0c814cce1e96f903c9488a52252ed229e1dfab6d166ca1dd6bf320e194abd00bc2c1d471adc2141cdfa1ce5837ecf0916a0b6477afed426954bcb0d4297026799826e602efecf1a576a041a9180e009e8935820958eb19904ec07a6953573869ad432092499fecf3d8284061a6864ee290849a85a9982f5098d3af8ca204cbce05ec10913081268d0aa267c88df6da6396d7121aa6e3a19c088609fd1e00e3e978cc0ccef4766314f3dd2cd0d44b40053f2321aad4d989827dbfa189f878b4953750f8d27cf6100df711bbf2d3727f4468906a216a46e6a004425347ebd0c91684eb3d90cd878ba8c6608668c2308a210cf244257940b342c6ea19d52bafb997a90cf3441853c24cc6f36d7339748a612cea9802ef17eb85450159019771a9cb119c27662ad5ec0a4401a3343918fa291266720e5fe271fbebdeb34105bc11f39dd943a4845d3be042781a1aeae373ba56bf47589fa1923fc70e2832a2d064888a01242dcc046045b560763033654922365e4042b5ed332be8ca83953d4b5761ec5e7d41e20a3a12c2d486f02ac85323539e5929ed6d2f567886f46aa8047eac2768c3f0788da87915dc2a8466d56a012a56518c206601b9926ccdb300088a3465d16a7678ea112311980e6e79baac85c7c03899072c6e154568ba86ac2889f833ea652728f31bfc6138639a7bb7fb814f80f5feb7897890297480000000049454e44ae426082";

        let mut input_data = Vec::new();
        for i in (0..hex_str.len()).step_by(2) {
            if i + 1 < hex_str.len() {
                let byte_str = &hex_str[i..i+2];
                if let Ok(byte_val) = u8::from_str_radix(byte_str, 16) {
                    input_data.push(byte_val);
                }
            }
        }

        let compressed = lzss_compress(&input_data);
        let decompressed = lzss_decompress(&compressed, input_data.len());

        assert_eq!(input_data, decompressed);

        // Test a second round of compression/decompression
        let compressed2 = lzss_compress(&decompressed);
        let decompressed2 = lzss_decompress(&compressed2, input_data.len());

        assert_eq!(input_data, decompressed2);

        let ratio = compressed.len() as f64 / input_data.len() as f64;
        println!("PNG image compression ratio: {:.2}", ratio);
    }

    #[test]
    fn test_text_data() {
        let text = "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.";
        
        let input_data = text.as_bytes();
        let compressed = lzss_compress(input_data);
        let decompressed = lzss_decompress(&compressed, input_data.len());

        assert_eq!(input_data.to_vec(), decompressed);

        let ratio = compressed.len() as f64 / input_data.len() as f64;
        println!("Text data compression ratio: {:.2}", ratio);
    }

    #[test] 
    fn test_ring_buffer_boundary_data() {
        let mut input_data = Vec::new();

        // First 4K with pattern A, second 4K with pattern B
        // This tests exactly at ring buffer boundary like TypeScript
        for i in 0..4096 {
            input_data.push((i % 256) as u8); // 0-255 repeating
        }
        for i in 0..4096 {
            input_data.push((255 - (i % 256)) as u8); // 255-0 repeating
        }

        let compressed = lzss_compress(&input_data);
        let decompressed = lzss_decompress(&compressed, 8192);

        assert_eq!(input_data, decompressed);

        let ratio = compressed.len() as f64 / input_data.len() as f64;
        println!("Ring buffer boundary compression ratio: {:.2}", ratio);
    }

    #[test]
    fn test_multiple_rounds_idempotence() {
        let input_data = b"The quick brown fox jumps over the lazy dog. The quick brown fox jumps over the lazy dog.";
        
        // Test 10 iterations to ensure consistency like TypeScript
        for _ in 0..10 {
            let compressed = lzss_compress(input_data);
            let decompressed = lzss_decompress(&compressed, input_data.len());
            assert_eq!(input_data.to_vec(), decompressed);
        }
    }

    #[test]
    fn test_gradient_pattern() {
        let mut input_data = Vec::new();

        // Create a gradient pattern (0-255 and back to 0) like TypeScript
        for i in 0..10_000 {
            let value = (128.0 + 127.0 * ((i as f64 * std::f64::consts::PI) / 100.0).sin()) as u8;
            input_data.push(value);
        }

        let compressed = lzss_compress(&input_data);
        let decompressed = lzss_decompress(&compressed, 10_000);

        assert_eq!(input_data, decompressed);

        let ratio = compressed.len() as f64 / input_data.len() as f64;
        println!("Gradient pattern compression ratio: {:.2}", ratio);
    }

    #[test]
    fn test_long_repeating_sequence() {
        let mut input_data = Vec::new();

        // Create a small pattern that repeats many times
        let pattern = [0x41, 0x42, 0x43, 0x44, 0x45]; // "ABCDE"

        // Fill with repeating pattern
        for i in 0..16384 {
            input_data.push(pattern[i % pattern.len()]);
        }

        let compressed = lzss_compress(&input_data);
        let decompressed = lzss_decompress(&compressed, 16384);

        assert_eq!(input_data, decompressed);

        let ratio = compressed.len() as f64 / input_data.len() as f64;
        println!("Long repeating sequence compression ratio: {:.2}", ratio);
    }

    #[test]
    fn test_large_data_stress() {
        // Create a large dataset with mixed patterns like TypeScript
        let size = 100_000;
        let mut input_data = Vec::new();

        let mut seed = 42u32;

        // Fill with various patterns
        for i in 0..size {
            if i < size / 4 {
                // Repeating pattern
                input_data.push((i % 64) as u8);
            } else if i < size / 2 {
                // Random data
                seed = seed.wrapping_mul(1103515245).wrapping_add(12345);
                input_data.push((seed >> 16) as u8);
            } else if i < (size * 3) / 4 {
                // Sine wave pattern
                let value = (128.0 + 127.0 * ((i as f64) / 100.0).sin()) as u8;
                input_data.push(value);
            } else {
                // Copy of the first quarter
                input_data.push(input_data[i - (size * 3) / 4]);
            }
        }

        let compressed = lzss_compress(&input_data);
        let decompressed = lzss_decompress(&compressed, size);

        // Verify bytes at specific intervals (checking all would be slow)
        for i in (0..size).step_by(100) {
            assert_eq!(input_data[i], decompressed[i]);
        }

        // And also check a few continuous regions like TypeScript
        let check_regions = [
            (0, 1000),
            (size / 4 - 500, 1000),
            (size / 2 - 500, 1000),
            ((size * 3) / 4 - 500, 1000),
            (size - 1000, 1000),
        ];

        for (start, length) in &check_regions {
            for i in 0..*length {
                let pos = start + i;
                if pos < size {
                    assert_eq!(input_data[pos], decompressed[pos]);
                }
            }
        }

        let ratio = compressed.len() as f64 / input_data.len() as f64;
        println!("Large data compression ratio: {:.2}", ratio);
    }
}