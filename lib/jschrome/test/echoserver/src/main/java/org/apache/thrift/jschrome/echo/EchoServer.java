/**
 * Helios, OpenSource Monitoring
 * Brought to you by the Helios Development Group
 *
 * Copyright 2007, Helios Development Group and individual contributors
 * as indicated by the @author tags. See the copyright.txt file in the
 * distribution for a full listing of individual contributors.
 *
 * This is free software; you can redistribute it and/or modify it
 * under the terms of the GNU Lesser General Public License as
 * published by the Free Software Foundation; either version 2.1 of
 * the License, or (at your option) any later version.
 *
 * This software is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public
 * License along with this software; if not, write to the Free
 * Software Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA
 * 02110-1301 USA, or see the FSF site: http://www.fsf.org. 
 *
 */
package org.apache.thrift.jschrome.echo;

import java.net.InetSocketAddress;
import java.util.concurrent.Executors;

import org.jboss.netty.bootstrap.ConnectionlessBootstrap;
import org.jboss.netty.bootstrap.ServerBootstrap;
import org.jboss.netty.channel.ChannelHandler;
import org.jboss.netty.channel.ChannelPipeline;
import org.jboss.netty.channel.ChannelPipelineFactory;
import org.jboss.netty.channel.Channels;
import org.jboss.netty.channel.FixedReceiveBufferSizePredictorFactory;
import org.jboss.netty.channel.socket.nio.NioDatagramChannelFactory;
import org.jboss.netty.channel.socket.nio.NioServerSocketChannelFactory;
import org.jboss.netty.handler.logging.LoggingHandler;
import org.jboss.netty.logging.InternalLogLevel;
import org.jboss.netty.logging.InternalLoggerFactory;
import org.jboss.netty.logging.Slf4JLoggerFactory;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * <p>Title: EchoServer</p>
 * <p>Description: Simple TCP and UDP Echo Server</p> 
 * <p>Company: Helios Development Group LLC</p>
 * @author Whitehead (nwhitehead AT heliosdev DOT org)
 * <p><code>org.apache.thrift.jschrome.echo.EchoServer</code></p>
 */

public class EchoServer {
	/** Static class logger */
	private static final Logger log = LoggerFactory.getLogger("EchoServer"); 	
	 /** The shared TCP echo handler */
	private static final ChannelHandler tcpHandler = new TCPEchoServerHandler();
	 /** The shared UDP echo handler */
	private static final ChannelHandler udpHandler = new UDPEchoServerHandler();
	
	/** The default TCP listener port */
	public static final int DEFAULT_TCP_PORT = 3333;
	/** The default UDP listener port */
	public static final int DEFAULT_UDP_PORT = 3434;
	
	/** The actual tcp port */
	protected static int tcpPort = DEFAULT_TCP_PORT;
	/** The actual udp port */
	protected static int udpPort = DEFAULT_UDP_PORT;
	
	/** Indicates if the pipeline logger should be in Hex Mode */
	static boolean hexMode = false;
	
    /**
     * Boots the Echo Server
     * @param args Options as follows:<ul>
     * 	<li><b>--tport &lt;tcp listen port&gt;</b>: Override the default TCP listening port. Default is 3333</li>
     *  <li><b>--uport &lt;udp listen port&gt;</b>: Override the default UDP listening port. Default is 3434</li>
     * 	<li><b>--hex &lt;true|false&gt;</b>: Enables or disables the pipeline logging handler's hex mode</li>
     * </ul>
     * @throws Exception thrown on any startup error
     */
	public static void main(String[] args) throws Exception {
		processArgs(args);
		InternalLoggerFactory.setDefaultFactory(new Slf4JLoggerFactory());
		// Configure the server.
		ServerBootstrap bootstrap = new ServerBootstrap(
				new NioServerSocketChannelFactory(
						Executors.newCachedThreadPool(),
						Executors.newCachedThreadPool()));

		// Set up the pipeline factory.
		bootstrap.setPipelineFactory(new ChannelPipelineFactory() {
			public ChannelPipeline getPipeline() throws Exception {
				return Channels.pipeline(new LoggingHandler("TCP", InternalLogLevel.INFO, hexMode), tcpHandler);
			}
		});


		// Bind and start to accept incoming connections.
		InetSocketAddress isa = new InetSocketAddress("0.0.0.0", tcpPort);
		bootstrap.bind(isa);
		log.info("TCP EchoServer Listening on [{}]", isa);

		ConnectionlessBootstrap cboot = new ConnectionlessBootstrap(
				new NioDatagramChannelFactory(Executors.newCachedThreadPool())
				);
		cboot.setPipelineFactory(new ChannelPipelineFactory() {
			public ChannelPipeline getPipeline() throws Exception {
				return Channels.pipeline(new LoggingHandler("UDP", InternalLogLevel.INFO, hexMode), udpHandler);
			}
		});
		InetSocketAddress uisa = new InetSocketAddress("0.0.0.0", udpPort);
		cboot.setOption("broadcast", "false");
		cboot.setOption("receiveBufferSizePredictorFactory",new FixedReceiveBufferSizePredictorFactory(1024));
		cboot.bind(uisa);
		log.info("UDP EchoServer Listening on [{}]", uisa);


	}
    
    protected static void processArgs(String...args) {
    	if(args.length==0) return;
    	final int lastIndex = args.length-1;
    	for(int i = 0; i < args.length; i++) {
    		if(i==lastIndex) break;
    		if("--tport".equalsIgnoreCase(args[i])) {
    			i++; String port = args[i];
    			try {
    				int p = Integer.parseInt(port);
    				tcpPort = p;
    			} catch (Exception x) {
    				log.error("Invalid tcp port:" + port);
    			}
    		} else if("--uport".equalsIgnoreCase(args[i])) {
    			i++; String port = args[i];
    			try {
    				int p = Integer.parseInt(port);
    				udpPort = p;
    			} catch (Exception x) {
    				log.error("Invalid udp port:" + port);
    			}    			
    		} else if("--hex".equalsIgnoreCase(args[i])) {
    			i++; String bool = args[i];
    			hexMode = (bool.equalsIgnoreCase("true") || bool.equalsIgnoreCase("y"));
    		}
    	}
    }
}